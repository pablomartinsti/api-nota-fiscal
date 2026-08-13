import { describe, expect, it, vi } from 'vitest';

import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { Empresa, RegimeTributario } from '../entities/Empresa';
import { AmbienteFiscal } from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { CertificadoA1InvalidoError } from '../errors/CertificadoA1InvalidoError';
import { ProvedorCertificadoA1 } from '../fiscal/certificados-a1/CertificadoA1';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { CifradorTexto } from '../security/CifradorTexto';
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
  it('deve salvar certificado validado no banco com conteudo e senha criptografados', async () => {
    const { service, salvar, criarProvedorCertificado } = criarService();

    const configuracao = await service.executar(autenticacao, input);

    expect(criarProvedorCertificado).toHaveBeenCalledWith({
      conteudoBase64: input.certificadoA1Base64,
      senha: 'senha-certificado',
    });
    expect(salvar).toHaveBeenCalledOnce();
    expect(configuracao.certificadoA1Path).toBeUndefined();
    expect(configuracao.certificadoA1NomeArquivo).toBe('empresa.pfx');
    expect(configuracao.certificadoA1Conteudo).toBe(
      `criptografado:${input.certificadoA1Base64}`,
    );
    expect(configuracao.certificadoA1Senha).toBe(
      'criptografado:senha-certificado',
    );
    expect(configuracao.possuiCertificadoA1()).toBe(true);
  });

  it('deve preservar ambiente fiscal e serie ja configurados', async () => {
    const existente = new ConfiguracaoFiscalEmpresa({
      id: 'configuracao-1',
      empresaId: 'empresa-1',
      ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
      serieDpsPadrao: '9',
      certificadoA1NomeArquivo: 'antigo.pfx',
      certificadoA1Conteudo: 'criptografado:base64-antigo',
      certificadoA1Senha: 'criptografado:senha-antiga',
    });
    const { service } = criarService({
      configuracaoExistente: existente,
    });

    const configuracao = await service.executar(autenticacao, input);

    expect(configuracao.id).toBe('configuracao-1');
    expect(configuracao.ambienteFiscalPadrao).toBe(AmbienteFiscal.PRODUCAO);
    expect(configuracao.serieDpsPadrao).toBe('9');
    expect(configuracao.certificadoA1NomeArquivo).toBe('empresa.pfx');
  });

  it('nao deve salvar quando certificado for de outro CNPJ', async () => {
    const { service, salvar } = criarService({
      certificadoCnpj: '99999999000199',
    });

    await expect(
      service.executar(autenticacao, input),
    ).rejects.toBeInstanceOf(CertificadoA1CnpjDivergenteError);
    expect(salvar).not.toHaveBeenCalled();
  });

  it('nao deve salvar quando certificado for invalido', async () => {
    const { service, salvar } = criarService({
      erroCertificado: new CertificadoA1InvalidoError(),
    });

    await expect(
      service.executar(autenticacao, input),
    ).rejects.toBeInstanceOf(CertificadoA1InvalidoError);
    expect(salvar).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando nao conseguir salvar configuracao fiscal', async () => {
    const { service } = criarService({
      erroSalvar: new Error('falha no banco'),
    });

    await expect(service.executar(autenticacao, input)).rejects.toThrow(
      'falha no banco',
    );
  });

  it('deve rejeitar quando empresa autenticada nao existir', async () => {
    const { service, criarProvedorCertificado } = criarService({
      empresa: null,
    });

    await expect(
      service.executar(autenticacao, input),
    ).rejects.toBeInstanceOf(AutenticacaoInvalidaError);
    expect(criarProvedorCertificado).not.toHaveBeenCalled();
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
      criarProvedorCertificado,
    ),
    salvar,
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
