import { describe, expect, it, vi } from 'vitest';

import {
  NotaServicoEventoFiscal,
  StatusEventoFiscalNotaServico,
  TipoEventoFiscalNotaServico,
} from '../entities/NotaServicoEventoFiscal';
import { NotaServico } from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { NotaServicoEventoFiscalRepository } from '../repositories/NotaServicoEventoFiscalRepository';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { ListarEventosFiscaisNotaServicoService } from './ListarEventosFiscaisNotaServicoService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

describe('ListarEventosFiscaisNotaServicoService', () => {
  it('deve listar historico fiscal da nota da propria empresa', async () => {
    const evento = criarEvento();
    const { service, listarPorNotaEEmpresa } = criarService(criarNota(), [
      evento,
    ]);

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(listarPorNotaEEmpresa).toHaveBeenCalledWith('nota-1', 'empresa-1');
    expect(resultado).toEqual([evento]);
  });

  it('deve rejeitar nota inexistente ou de outra empresa', async () => {
    const { service, listarPorNotaEEmpresa } = criarService(null);

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(NotaServicoNaoEncontradaError);
    expect(listarPorNotaEEmpresa).not.toHaveBeenCalled();
  });
});

function criarService(
  nota: NotaServico | null,
  eventos: NotaServicoEventoFiscal[] = [],
) {
  const notaRepository: NotaServicoRepository = {
    salvar: vi.fn(),
    iniciarProcessamentoEnvio: vi.fn(),
    buscarPorIdEEmpresaId: vi.fn().mockResolvedValue(nota),
    listarPorEmpresaId: vi.fn(),
    buscarMaiorNumeroDpsPorEmpresaAmbienteESerie: vi.fn(),
  };
  const listarPorNotaEEmpresa = vi.fn().mockResolvedValue(eventos);
  const eventoFiscalRepository: NotaServicoEventoFiscalRepository = {
    salvar: vi.fn(),
    listarPorNotaEEmpresa,
  };

  return {
    service: new ListarEventosFiscaisNotaServicoService(
      notaRepository,
      eventoFiscalRepository,
    ),
    listarPorNotaEEmpresa,
  };
}

function criarNota(): NotaServico {
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

function criarEvento(): NotaServicoEventoFiscal {
  return new NotaServicoEventoFiscal({
    id: 'evento-1',
    empresaId: 'empresa-1',
    notaServicoId: 'nota-1',
    usuarioId: 'usuario-1',
    tipo: TipoEventoFiscalNotaServico.ENVIO_DPS,
    status: StatusEventoFiscalNotaServico.SUCESSO,
    statusHttp: 200,
    mensagem: 'DPS autorizada.',
  });
}
