import { describe, expect, it, vi } from 'vitest';

import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { AmbienteFiscal } from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { AtualizarConfiguracaoFiscalEmpresaAutenticadaService } from './AtualizarConfiguracaoFiscalEmpresaAutenticadaService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

describe('AtualizarConfiguracaoFiscalEmpresaAutenticadaService', () => {
  it('deve criar configuracao fiscal para a empresa autenticada', async () => {
    const { service, salvar } = criarService(null);

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
    expect(configuracao.certificadoA1Senha).toBe('senha');
    expect(configuracao.ativo).toBe(true);
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
});

function criarService(configuracaoExistente: ConfiguracaoFiscalEmpresa | null) {
  const salvar = vi.fn(
    async (configuracao: ConfiguracaoFiscalEmpresa) => configuracao,
  );
  const repository: ConfiguracaoFiscalEmpresaRepository = {
    salvar,
    buscarPorEmpresaId: vi.fn().mockResolvedValue(configuracaoExistente),
  };

  return {
    service: new AtualizarConfiguracaoFiscalEmpresaAutenticadaService(
      repository,
    ),
    salvar,
  };
}
