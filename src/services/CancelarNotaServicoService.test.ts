import { describe, expect, it, vi } from 'vitest';

import { NotaServico, StatusNota } from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { OperacaoSimuladaBloqueadaError } from '../errors/OperacaoSimuladaBloqueadaError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { CancelarNotaServicoService } from './CancelarNotaServicoService';
import { ValidarOperacaoSimuladaService } from './ValidarOperacaoSimuladaService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

describe('CancelarNotaServicoService', () => {
  it('deve cancelar nota simulada fora de producao', async () => {
    const nota = criarNotaEmitida();
    const { service, salvar } = criarService(nota);

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(salvar).toHaveBeenCalledOnce();
    expect(resultado.status).toBe(StatusNota.CANCELADA);
  });

  it('nao deve cancelar nota inexistente', async () => {
    const { service } = criarService(null);

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(NotaServicoNaoEncontradaError);
  });

  it('nao deve cancelar nota fora de emitida', async () => {
    const { service } = criarService(criarNotaRascunho());

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
  });

  it('deve bloquear cancelamento simulado em producao', async () => {
    const { service, buscarPorIdEEmpresaId, salvar } = criarService(
      criarNotaEmitida(),
      'production',
    );

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(OperacaoSimuladaBloqueadaError);
    expect(buscarPorIdEEmpresaId).not.toHaveBeenCalled();
    expect(salvar).not.toHaveBeenCalled();
  });
});

function criarService(
  nota: NotaServico | null,
  nodeEnv = 'development',
) {
  const salvar = vi.fn(async (notaParaSalvar: NotaServico) => notaParaSalvar);
  const buscarPorIdEEmpresaId = vi.fn().mockResolvedValue(nota);
  const notaRepository: NotaServicoRepository = {
    salvar,
    iniciarProcessamentoEnvio: vi.fn(),
    buscarPorIdEEmpresaId,
    listarPorEmpresaId: vi.fn(),
    buscarMaiorNumeroDpsPorEmpresaAmbienteESerie: vi.fn(),
  };

  return {
    service: new CancelarNotaServicoService(
      notaRepository,
      new ValidarOperacaoSimuladaService(nodeEnv),
    ),
    salvar,
    buscarPorIdEEmpresaId,
  };
}

function criarNotaEmitida(): NotaServico {
  return new NotaServico({
    id: 'nota-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    valorServico: 100,
    aliquotaIss: 5,
    descricao: 'Consultoria',
    status: StatusNota.EMITIDA,
    numeroNfse: '100',
    codigoVerificacao: 'ABC123',
    dataEmissao: new Date('2026-06-19T10:00:00.000Z'),
  });
}

function criarNotaRascunho(): NotaServico {
  return new NotaServico({
    id: 'nota-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    valorServico: 100,
    aliquotaIss: 5,
    descricao: 'Consultoria',
  });
}
