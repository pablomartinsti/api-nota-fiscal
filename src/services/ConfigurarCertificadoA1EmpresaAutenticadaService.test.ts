import { describe, expect, it, vi } from 'vitest';

import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { Empresa, RegimeTributario } from '../entities/Empresa';
import { AmbienteFiscal } from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { CertificadoA1InvalidoError } from '../errors/CertificadoA1InvalidoError';
import { ProvedorCertificadoA1 } from '../fiscal/CertificadoA1';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { CifradorTexto } from '../security/CifradorTexto';
import { ArmazenadorCertificadoA1 } from '../storage/ArmazenadorCertificadoA1';
import { ConfigurarCertificadoA1EmpresaAutenticadaService } from './ConfigurarCertificadoA1EmpresaAutenticadaService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

const input = {
  certificadoA1NomeArquivo: 'empresa.pfx',
  certificadoA1Base64: Buffer.from('conteudo').toString('base64'),
  certificadoA1Senha: 'senha-certificado',
};

describe('ConfigurarCertificadoA1EmpresaAutenticadaService', () => {
  it('deve salvar certificado validado e criptografar senha', async () => {
    const { service, salvar, armazenador, criarProvedorCertificado } =
      criarService();

    const configuracao = await service.executar(autenticacao, input);

    expect(armazenador.salvar).toHaveBeenCalledWith({
      empresaId: 'empresa-1',
      nomeArquivo: 'empresa.pfx',
      conteudoBase64: input.certificadoA1Base64,
    });
    expect(criarProvedorCertificado).toHaveBeenCalledWith({
      caminho: 'storage/certificados/empresa-1.pfx',
      senha: 'senha-certificado',
    });
    expect(salvar).toHaveBeenCalledOnce();
    expect(configuracao.certificadoA1Path).toBe(
      'storage/certificados/empresa-1.pfx',
    );
    expect(configuracao.certificadoA1Senha).toBe(
      'criptografado:senha-certificado',
    );
  });

  it('deve preservar ambiente fiscal e serie ja configurados', async () => {
    const existente = new ConfiguracaoFiscalEmpresa({
      id: 'configuracao-1',
      empresaId: 'empresa-1',
      ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
      serieDpsPadrao: '9',
      certificadoA1Path: 'storage/certificados/antigo.pfx',
      certificadoA1Senha: 'criptografado:senha-antiga',
    });
    const { service, armazenador } = criarService({
      configuracaoExistente: existente,
    });

    const configuracao = await service.executar(autenticacao, input);

    expect(configuracao.id).toBe('configuracao-1');
    expect(configuracao.ambienteFiscalPadrao).toBe(AmbienteFiscal.PRODUCAO);
    expect(configuracao.serieDpsPadrao).toBe('9');
    expect(armazenador.remover).not.toHaveBeenCalled();
  });

  it('deve remover arquivo novo quando certificado for de outro CNPJ', async () => {
    const { service, salvar, armazenador } = criarService({
      certificadoCnpj: '99999999000199',
    });

    await expect(
      service.executar(autenticacao, input),
    ).rejects.toBeInstanceOf(CertificadoA1CnpjDivergenteError);
    expect(armazenador.remover).toHaveBeenCalledWith(
      'storage/certificados/empresa-1.pfx',
    );
    expect(salvar).not.toHaveBeenCalled();
  });

  it('deve remover arquivo novo quando certificado for invalido', async () => {
    const { service, salvar, armazenador } = criarService({
      erroCertificado: new CertificadoA1InvalidoError(),
    });

    await expect(
      service.executar(autenticacao, input),
    ).rejects.toBeInstanceOf(CertificadoA1InvalidoError);
    expect(armazenador.remover).toHaveBeenCalledWith(
      'storage/certificados/empresa-1.pfx',
    );
    expect(salvar).not.toHaveBeenCalled();
  });

  it('deve remover arquivo novo quando nao conseguir salvar configuracao fiscal', async () => {
    const { service, armazenador } = criarService({
      erroSalvar: new Error('falha no banco'),
    });

    await expect(service.executar(autenticacao, input)).rejects.toThrow(
      'falha no banco',
    );
    expect(armazenador.remover).toHaveBeenCalledWith(
      'storage/certificados/empresa-1.pfx',
    );
  });

  it('deve rejeitar quando empresa autenticada nao existir', async () => {
    const { service, armazenador } = criarService({ empresa: null });

    await expect(
      service.executar(autenticacao, input),
    ).rejects.toBeInstanceOf(AutenticacaoInvalidaError);
    expect(armazenador.salvar).not.toHaveBeenCalled();
  });
});

function criarService(props?: {
  configuracaoExistente?: ConfiguracaoFiscalEmpresa | null;
  empresa?: Empresa | null;
  certificadoCnpj?: string;
  erroCertificado?: Error;
  erroSalvar?: Error;
}) {
  const salvar = props?.erroSalvar
    ? vi.fn().mockRejectedValue(props.erroSalvar)
    : vi.fn(async (configuracao: ConfiguracaoFiscalEmpresa) => configuracao);
  const repository: ConfiguracaoFiscalEmpresaRepository = {
    salvar,
    buscarPorEmpresaId: vi
      .fn()
      .mockResolvedValue(props?.configuracaoExistente ?? null),
  };
  const empresaRepository: EmpresaRepository = {
    salvar: vi.fn(),
    buscarPorId: vi
      .fn()
      .mockResolvedValue(
        props?.empresa === undefined ? criarEmpresa() : props.empresa,
      ),
    buscarPorCnpj: vi.fn(),
  };
  const cifradorTexto: CifradorTexto = {
    criptografar: vi.fn((texto: string) => `criptografado:${texto}`),
    descriptografar: vi.fn((texto: string) =>
      texto.replace(/^criptografado:/, ''),
    ),
    estaCriptografado: vi.fn((texto: string) =>
      texto.startsWith('criptografado:'),
    ),
  };
  const armazenador: ArmazenadorCertificadoA1 = {
    salvar: vi.fn().mockResolvedValue({
      caminho: 'storage/certificados/empresa-1.pfx',
      tamanhoBytes: 100,
    }),
    remover: vi.fn().mockResolvedValue(undefined),
  };
  const provedorCertificado: ProvedorCertificadoA1 = {
    obter: props?.erroCertificado
      ? vi.fn().mockRejectedValue(props.erroCertificado)
      : vi.fn().mockResolvedValue({
          chavePrivadaPem: 'chave',
          certificadoPem: 'certificado',
          cnpj: props?.certificadoCnpj ?? '12345678000199',
          validoDe: new Date('2026-01-01T00:00:00.000Z'),
          validoAte: new Date('2027-01-01T00:00:00.000Z'),
        }),
  };
  const criarProvedorCertificado = vi.fn(() => provedorCertificado);

  return {
    service: new ConfigurarCertificadoA1EmpresaAutenticadaService(
      repository,
      empresaRepository,
      cifradorTexto,
      armazenador,
      criarProvedorCertificado,
    ),
    salvar,
    armazenador,
    criarProvedorCertificado,
  };
}

function criarEmpresa(): Empresa {
  return new Empresa({
    id: 'empresa-1',
    razaoSocial: 'Empresa Teste Ltda',
    cnpj: '12345678000199',
    regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
    cidade: 'Uberlandia',
    uf: 'MG',
  });
}
