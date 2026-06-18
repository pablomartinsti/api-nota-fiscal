import { describe, expect, it, vi } from 'vitest';

import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { Empresa, RegimeTributario } from '../entities/Empresa';
import { AmbienteFiscal } from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { CertificadoA1InvalidoError } from '../errors/CertificadoA1InvalidoError';
import { ProvedorCertificadoA1 } from '../fiscal/CertificadoA1';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { CifradorTexto } from '../security/CifradorTexto';
import { AtualizarConfiguracaoFiscalEmpresaAutenticadaService } from './AtualizarConfiguracaoFiscalEmpresaAutenticadaService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

describe('AtualizarConfiguracaoFiscalEmpresaAutenticadaService', () => {
  it('deve criar configuracao fiscal para a empresa autenticada', async () => {
    const { service, salvar, criarProvedorCertificado } = criarService(null);

    const configuracao = await service.executar(autenticacao, {
      ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
      serieDpsPadrao: '3',
      certificadoA1Path: 'C:/certificados/empresa.pfx',
      certificadoA1Senha: 'senha',
    });

    expect(salvar).toHaveBeenCalledOnce();
    expect(configuracao.empresaId).toBe('empresa-1');
    expect(configuracao.ambienteFiscalPadrao).toBe(
      AmbienteFiscal.HOMOLOGACAO,
    );
    expect(configuracao.serieDpsPadrao).toBe('3');
    expect(configuracao.certificadoA1Path).toBe(
      'C:/certificados/empresa.pfx',
    );
    expect(configuracao.certificadoA1Senha).toBe('criptografado:senha');
    expect(configuracao.ativo).toBe(true);
    expect(criarProvedorCertificado).toHaveBeenCalledWith({
      caminho: 'C:/certificados/empresa.pfx',
      senha: 'senha',
    });
  });

  it('deve atualizar configuracao existente preservando certificado quando nao informado', async () => {
    const existente = new ConfiguracaoFiscalEmpresa({
      id: 'configuracao-1',
      empresaId: 'empresa-1',
      ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
      serieDpsPadrao: '1',
      certificadoA1Path: 'C:/certificados/empresa.pfx',
      certificadoA1Senha: 'senha-antiga',
    });
    const { service } = criarService(existente);

    const configuracao = await service.executar(autenticacao, {
      ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
      serieDpsPadrao: '9',
    });

    expect(configuracao.id).toBe('configuracao-1');
    expect(configuracao.ambienteFiscalPadrao).toBe(AmbienteFiscal.PRODUCAO);
    expect(configuracao.serieDpsPadrao).toBe('9');
    expect(configuracao.certificadoA1Path).toBe(
      'C:/certificados/empresa.pfx',
    );
    expect(configuracao.certificadoA1Senha).toBe('senha-antiga');
  });

  it('deve permitir limpar certificado informando null', async () => {
    const existente = new ConfiguracaoFiscalEmpresa({
      id: 'configuracao-1',
      empresaId: 'empresa-1',
      certificadoA1Path: 'C:/certificados/empresa.pfx',
      certificadoA1Senha: 'senha',
    });
    const { service } = criarService(existente);

    const configuracao = await service.executar(autenticacao, {
      ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
      serieDpsPadrao: '1',
      certificadoA1Path: null,
      certificadoA1Senha: null,
    });

    expect(configuracao.certificadoA1Path).toBeUndefined();
    expect(configuracao.certificadoA1Senha).toBeUndefined();
  });

  it('deve rejeitar certificado de outro CNPJ', async () => {
    const { service, salvar } = criarService(null, {
      certificadoCnpj: '99999999000199',
    });

    await expect(
      service.executar(autenticacao, {
        ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
        serieDpsPadrao: '1',
        certificadoA1Path: 'C:/certificados/outra-empresa.pfx',
        certificadoA1Senha: 'senha',
      }),
    ).rejects.toBeInstanceOf(CertificadoA1CnpjDivergenteError);
    expect(salvar).not.toHaveBeenCalled();
  });

  it('deve rejeitar certificado invalido', async () => {
    const { service, salvar } = criarService(null, {
      erroCertificado: new CertificadoA1InvalidoError(),
    });

    await expect(
      service.executar(autenticacao, {
        ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
        serieDpsPadrao: '1',
        certificadoA1Path: 'C:/certificados/invalido.pfx',
        certificadoA1Senha: 'senha',
      }),
    ).rejects.toBeInstanceOf(CertificadoA1InvalidoError);
    expect(salvar).not.toHaveBeenCalled();
  });
});

function criarService(
  configuracaoExistente: ConfiguracaoFiscalEmpresa | null,
  props?: {
    certificadoCnpj?: string;
    erroCertificado?: Error;
  },
) {
  const salvar = vi.fn(
    async (configuracao: ConfiguracaoFiscalEmpresa) => configuracao,
  );
  const repository: ConfiguracaoFiscalEmpresaRepository = {
    salvar,
    buscarPorEmpresaId: vi.fn().mockResolvedValue(configuracaoExistente),
  };
  const empresaRepository: EmpresaRepository = {
    salvar: vi.fn(),
    buscarPorId: vi.fn().mockResolvedValue(criarEmpresa()),
    buscarPorCnpj: vi.fn(),
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
  const cifradorTexto: CifradorTexto = {
    criptografar: vi.fn((texto: string) => `criptografado:${texto}`),
    descriptografar: vi.fn((texto: string) =>
      texto.replace(/^criptografado:/, ''),
    ),
    estaCriptografado: vi.fn((texto: string) =>
      texto.startsWith('criptografado:'),
    ),
  };

  return {
    service: new AtualizarConfiguracaoFiscalEmpresaAutenticadaService(
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
