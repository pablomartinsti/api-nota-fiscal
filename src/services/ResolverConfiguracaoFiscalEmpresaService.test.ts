import { describe, expect, it, vi } from 'vitest';

import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { AmbienteFiscal } from '../entities/NotaServico';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
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
});

function criarService(configuracao: ConfiguracaoFiscalEmpresa | null) {
  const repository: ConfiguracaoFiscalEmpresaRepository = {
    buscarPorEmpresaId: vi.fn().mockResolvedValue(configuracao),
  };

  return new ResolverConfiguracaoFiscalEmpresaService(repository);
}
