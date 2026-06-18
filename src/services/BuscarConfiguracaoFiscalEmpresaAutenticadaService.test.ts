import { describe, expect, it, vi } from 'vitest';

import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { AmbienteFiscal } from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { BuscarConfiguracaoFiscalEmpresaAutenticadaService } from './BuscarConfiguracaoFiscalEmpresaAutenticadaService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

describe('BuscarConfiguracaoFiscalEmpresaAutenticadaService', () => {
  it('deve retornar a configuracao fiscal da empresa autenticada', async () => {
    const configuracao = new ConfiguracaoFiscalEmpresa({
      id: 'configuracao-1',
      empresaId: 'empresa-1',
      ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
      serieDpsPadrao: '2',
      certificadoA1Path: 'C:/certificados/empresa.pfx',
      certificadoA1Senha: 'senha',
    });
    const service = criarService(configuracao);

    const resultado = await service.executar(autenticacao);

    expect(resultado.configurada).toBe(true);
    expect(resultado.configuracao).toBe(configuracao);
  });

  it('deve retornar padrao nao configurado quando a empresa ainda nao tiver configuracao fiscal', async () => {
    const service = criarService(null);

    const resultado = await service.executar(autenticacao);

    expect(resultado.configurada).toBe(false);
    expect(resultado.configuracao.empresaId).toBe('empresa-1');
    expect(resultado.configuracao.ambienteFiscalPadrao).toBe(
      AmbienteFiscal.HOMOLOGACAO,
    );
    expect(resultado.configuracao.serieDpsPadrao).toBe('1');
    expect(resultado.configuracao.ativo).toBe(false);
  });
});

function criarService(configuracao: ConfiguracaoFiscalEmpresa | null) {
  const repository: ConfiguracaoFiscalEmpresaRepository = {
    salvar: vi.fn(),
    buscarPorEmpresaId: vi.fn().mockResolvedValue(configuracao),
  };

  return new BuscarConfiguracaoFiscalEmpresaAutenticadaService(repository);
}
