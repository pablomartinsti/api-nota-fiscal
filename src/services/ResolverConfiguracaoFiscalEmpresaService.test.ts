import { describe, expect, it, vi } from 'vitest';

import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { Empresa, RegimeTributario } from '../entities/Empresa';
import { AmbienteFiscal } from '../entities/NotaServico';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
import { RegimeTributarioProducaoNaoSuportadoError } from '../errors/RegimeTributarioProducaoNaoSuportadoError';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { CifradorTexto } from '../security/CifradorTexto';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';

describe('ResolverConfiguracaoFiscalEmpresaService', () => {
  it('deve retornar padroes quando a empresa nao tiver configuracao fiscal ativa', async () => {
    const service = criarService(null);

    const configuracao = await service.executar('empresa-1');
    const certificado = await service.obterCertificadoA1('empresa-1');

    expect(configuracao).toEqual({
      ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
      serieDpsPadrao: '1',
      emissaoHabilitada: true,
    });
    expect(certificado).toBeUndefined();
  });

  it('deve retornar configuracao fiscal ativa da empresa', async () => {
    const service = criarService(
      new ConfiguracaoFiscalEmpresa({
        empresaId: 'empresa-1',
        ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
        serieDpsPadrao: '12',
        certificadoA1Path: 'C:/certificados/empresa.pfx',
        certificadoA1Senha: 'senha',
      }),
    );

    await expect(service.executar('empresa-1')).resolves.toEqual({
      ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
      serieDpsPadrao: '12',
      certificadoA1Path: 'C:/certificados/empresa.pfx',
      certificadoA1Senha: 'senha',
      emissaoHabilitada: true,
    });
    await expect(service.obterCertificadoA1('empresa-1')).resolves.toEqual({
      caminho: 'C:/certificados/empresa.pfx',
      senha: 'senha',
    });
  });

  it('deve descriptografar senha do certificado somente ao obter certificado A1', async () => {
    const cifradorTexto: CifradorTexto = {
      criptografar: vi.fn(),
      descriptografar: vi.fn().mockReturnValue('senha-aberta'),
      estaCriptografado: vi
        .fn()
        .mockImplementation((texto: string) =>
          texto.startsWith('criptografado:'),
        ),
    };
    const service = criarService(
      new ConfiguracaoFiscalEmpresa({
        empresaId: 'empresa-1',
        certificadoA1Path: 'C:/certificados/empresa.pfx',
        certificadoA1Senha: 'criptografado:senha',
      }),
      cifradorTexto,
    );

    const configuracao = await service.executar('empresa-1');
    const certificado = await service.obterCertificadoA1('empresa-1');

    expect(configuracao.certificadoA1Senha).toBe('criptografado:senha');
    expect(certificado?.senha).toBe('senha-aberta');
  });

  it('deve descriptografar conteudo do certificado salvo no banco ao obter A1', async () => {
    const cifradorTexto: CifradorTexto = {
      criptografar: vi.fn(),
      descriptografar: vi.fn((texto: string) =>
        texto.replace(/^criptografado:/, ''),
      ),
      estaCriptografado: vi.fn((texto: string) =>
        texto.startsWith('criptografado:'),
      ),
    };
    const service = criarService(
      new ConfiguracaoFiscalEmpresa({
        empresaId: 'empresa-1',
        certificadoA1NomeArquivo: 'empresa.pfx',
        certificadoA1Conteudo: 'criptografado:base64-certificado',
        certificadoA1Senha: 'criptografado:senha',
      }),
      cifradorTexto,
    );

    const certificado = await service.obterCertificadoA1('empresa-1');

    expect(certificado).toEqual({
      caminho: undefined,
      conteudoBase64: 'base64-certificado',
      senha: 'senha',
    });
  });

  it('deve permitir fallback global apenas em homologacao', async () => {
    const service = criarService(null);

    await expect(
      service.obterCertificadoA1ParaAmbiente(
        'empresa-1',
        AmbienteFiscal.HOMOLOGACAO,
      ),
    ).resolves.toBeUndefined();
  });

  it('deve bloquear producao real sem certificado proprio da empresa', async () => {
    const service = criarService(null);

    await expect(
      service.obterCertificadoA1ParaAmbiente(
        'empresa-1',
        AmbienteFiscal.PRODUCAO,
      ),
    ).rejects.toBeInstanceOf(CertificadoA1EmpresaProducaoAusenteError);
  });

  it('deve bloquear producao real para regime tributario ainda nao suportado', async () => {
    const service = criarService(
      new ConfiguracaoFiscalEmpresa({
        empresaId: 'empresa-1',
        ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
        serieDpsPadrao: '1',
        certificadoA1Path: 'C:/certificados/empresa.pfx',
        certificadoA1Senha: 'senha',
      }),
      undefined,
      RegimeTributario.LUCRO_PRESUMIDO,
    );

    await expect(
      service.obterCertificadoA1ParaAmbiente(
        'empresa-1',
        AmbienteFiscal.PRODUCAO,
      ),
    ).rejects.toBeInstanceOf(RegimeTributarioProducaoNaoSuportadoError);
  });
});

function criarService(
  configuracao: ConfiguracaoFiscalEmpresa | null,
  cifradorTexto?: CifradorTexto,
  regimeTributario = RegimeTributario.SIMPLES_NACIONAL,
) {
  const repository: ConfiguracaoFiscalEmpresaRepository = {
    salvar: vi.fn(),
    buscarPorEmpresaId: vi.fn().mockResolvedValue(configuracao),
  };

  return new ResolverConfiguracaoFiscalEmpresaService(
    repository,
    criarEmpresaRepository(regimeTributario),
    cifradorTexto,
  );
}

function criarEmpresaRepository(
  regimeTributario: RegimeTributario,
): EmpresaRepository {
  return {
    salvar: vi.fn(),
    buscarPorId: vi.fn().mockResolvedValue(
      new Empresa({
        id: 'empresa-1',
        razaoSocial: 'Empresa Teste Ltda',
        cnpj: '12345678000199',
        regimeTributario,
        cidade: 'Uberlandia',
        uf: 'MG',
      }),
    ),
    buscarPorCnpj: vi.fn(),
  };
}
