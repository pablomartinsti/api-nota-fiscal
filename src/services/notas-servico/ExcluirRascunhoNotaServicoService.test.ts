import { describe, expect, it, vi } from 'vitest';

import { NotaServico, StatusNota } from '../../entities/NotaServico';
import { PerfilUsuario } from '../../entities/Usuario';
import { NotaServicoNaoEncontradaError } from '../../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../../errors/TransicaoStatusNotaInvalidaError';
import { NotaServicoRepository } from '../../repositories/NotaServicoRepository';
import { ExcluirRascunhoNotaServicoService } from './ExcluirRascunhoNotaServicoService';

describe('ExcluirRascunhoNotaServicoService', () => {
  it('deve excluir apenas nota em rascunho da empresa autenticada', async () => {
    const nota = criarNota(StatusNota.RASCUNHO);
    const excluirRascunhoPorIdEEmpresaId = vi.fn().mockResolvedValue(true);
    const service = criarService(nota, excluirRascunhoPorIdEEmpresaId);

    await service.executar(
      { usuarioId: 'usuario-1', empresaId: 'empresa-1', perfil: PerfilUsuario.DONO },
      'nota-1',
    );

    expect(excluirRascunhoPorIdEEmpresaId).toHaveBeenCalledWith(
      'nota-1',
      'empresa-1',
    );
  });

  it('deve rejeitar exclusao de nota ja emitida', async () => {
    const service = criarService(criarNota(StatusNota.EMITIDA));

    await expect(
      service.executar(
        { usuarioId: 'usuario-1', empresaId: 'empresa-1', perfil: PerfilUsuario.DONO },
        'nota-1',
      ),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
  });

  it('deve rejeitar nota inexistente ou de outra empresa', async () => {
    const service = criarService(null);

    await expect(
      service.executar(
        { usuarioId: 'usuario-1', empresaId: 'empresa-1', perfil: PerfilUsuario.DONO },
        'nota-inexistente',
      ),
    ).rejects.toBeInstanceOf(NotaServicoNaoEncontradaError);
  });
});

function criarService(
  nota: NotaServico | null,
  excluirRascunhoPorIdEEmpresaId = vi.fn().mockResolvedValue(true),
) {
  const notaRepository: NotaServicoRepository = {
    salvar: vi.fn(),
    iniciarProcessamentoEnvio: vi.fn(),
    buscarPorIdEEmpresaId: vi.fn().mockResolvedValue(nota),
    listarPorEmpresaId: vi.fn(),
    buscarMaiorNumeroDpsPorEmpresaAmbienteESerie: vi.fn(),
    excluirRascunhoPorIdEEmpresaId,
  };

  return new ExcluirRascunhoNotaServicoService(notaRepository);
}

function criarNota(status: StatusNota): NotaServico {
  return new NotaServico({
    id: 'nota-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    valorServico: 100,
    aliquotaIss: 5,
    descricao: 'Consultoria',
    status,
    numeroNfse: status === StatusNota.RASCUNHO ? undefined : '100',
    codigoVerificacao: status === StatusNota.RASCUNHO ? undefined : 'ABC123',
    dataEmissao: status === StatusNota.RASCUNHO ? undefined : new Date('2026-07-29T12:00:00.000Z'),
  });
}
