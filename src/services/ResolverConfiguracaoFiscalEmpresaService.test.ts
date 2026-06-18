import { describe, expect, it, vi } from 'vitest';

import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { AmbienteFiscal } from '../entities/NotaServico';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
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
});

function criarService(
  configuracao: ConfiguracaoFiscalEmpresa | null,
  cifradorTexto?: CifradorTexto,
) {
  const repository: ConfiguracaoFiscalEmpresaRepository = {
    salvar: vi.fn(),
    buscarPorEmpresaId: vi.fn().mockResolvedValue(configuracao),
  };

  return new ResolverConfiguracaoFiscalEmpresaService(
    repository,
    cifradorTexto,
  );
}
