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
  it('deve criar configuracao fiscal para a empresa autenticada sem certificado', async () => {
    const { service, salvar } = criarService(null);

    const configuracao = await service.executar(autenticacao, {
      ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
      serieDpsPadrao: '3',
    });

    expect(salvar).toHaveBeenCalledOnce();
    expect(configuracao.empresaId).toBe('empresa-1');
    expect(configuracao.ambienteFiscalPadrao).toBe(
      AmbienteFiscal.HOMOLOGACAO,
    );
    expect(configuracao.serieDpsPadrao).toBe('3');
    expect(configuracao.possuiCertificadoA1()).toBe(false);
    expect(configuracao.ativo).toBe(true);
  });

  it('deve atualizar configuracao existente preservando certificado', async () => {
    const existente = new ConfiguracaoFiscalEmpresa({
      id: 'configuracao-1',
      empresaId: 'empresa-1',
      ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
      serieDpsPadrao: '1',
      certificadoA1NomeArquivo: 'empresa.pfx',
      certificadoA1Conteudo: 'criptografado:base64',
      certificadoA1Senha: 'criptografado:senha-antiga',
    });
    const { service } = criarService(existente);

    const configuracao = await service.executar(autenticacao, {
      ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
      serieDpsPadrao: '9',
    });

    expect(configuracao.id).toBe('configuracao-1');
    expect(configuracao.ambienteFiscalPadrao).toBe(AmbienteFiscal.PRODUCAO);
    expect(configuracao.serieDpsPadrao).toBe('9');
    expect(configuracao.certificadoA1NomeArquivo).toBe('empresa.pfx');
    expect(configuracao.certificadoA1Conteudo).toBe('criptografado:base64');
    expect(configuracao.certificadoA1Senha).toBe('criptografado:senha-antiga');
    expect(configuracao.possuiCertificadoA1()).toBe(true);
  });

  it('deve permitir remover certificado explicitamente', async () => {
    const existente = new ConfiguracaoFiscalEmpresa({
      id: 'configuracao-1',
      empresaId: 'empresa-1',
      certificadoA1NomeArquivo: 'empresa.pfx',
      certificadoA1Conteudo: 'criptografado:base64',
      certificadoA1Senha: 'criptografado:senha',
      certificadoA1ValidoAte: new Date('2027-06-17T15:47:00.000Z'),
    });
    const { service } = criarService(existente);

    const configuracao = await service.executar(autenticacao, {
      ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
      serieDpsPadrao: '1',
      removerCertificadoA1: true,
    });

    expect(configuracao.certificadoA1NomeArquivo).toBeUndefined();
    expect(configuracao.certificadoA1Conteudo).toBeUndefined();
    expect(configuracao.certificadoA1Senha).toBeUndefined();
    expect(configuracao.certificadoA1ValidoAte).toBeUndefined();
    expect(configuracao.possuiCertificadoA1()).toBe(false);
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
