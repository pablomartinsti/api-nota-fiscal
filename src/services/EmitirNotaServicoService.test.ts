import { describe, expect, it, vi } from 'vitest';

import { NotaServico, StatusNota } from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { OperacaoSimuladaBloqueadaError } from '../errors/OperacaoSimuladaBloqueadaError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { EmissorNotaServico } from '../fiscal/EmissorNotaServico';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { EmitirNotaServicoService } from './EmitirNotaServicoService';
import { ValidarOperacaoSimuladaService } from './ValidarOperacaoSimuladaService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

describe('EmitirNotaServicoService', () => {
  it('deve emitir nota usando emissor simulado fora de producao', async () => {
    const nota = criarNota();
    const { service, salvar, emissor } = criarService(nota);

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(emissor.emitir).toHaveBeenCalledWith({ nota, simularFalha: false });
    expect(salvar).toHaveBeenCalledOnce();
    expect(resultado.status).toBe(StatusNota.EMITIDA);
    expect(resultado.numeroNfse).toBe('100');
  });

  it('deve registrar erro quando emissor simulado falhar', async () => {
    const nota = criarNota();
    const { service } = criarService(nota, false, 'development');

    const resultado = await service.executar(
      autenticacao,
      'nota-1',
      true,
    );

    expect(resultado.status).toBe(StatusNota.ERRO);
    expect(resultado.mensagemErro).toBe('Falha simulada.');
  });

  it('nao deve emitir nota inexistente', async () => {
    const { service, emissor } = criarService(null);

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(NotaServicoNaoEncontradaError);
    expect(emissor.emitir).not.toHaveBeenCalled();
  });

  it('nao deve emitir nota fora de rascunho', async () => {
    const { service, emissor } = criarService(criarNota(StatusNota.EMITIDA));

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
    expect(emissor.emitir).not.toHaveBeenCalled();
  });

  it('deve bloquear emissao simulada em producao', async () => {
    const { service, buscarPorIdEEmpresaId, salvar, emissor } = criarService(
      criarNota(),
      true,
      'production',
    );

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(OperacaoSimuladaBloqueadaError);
    expect(buscarPorIdEEmpresaId).not.toHaveBeenCalled();
    expect(emissor.emitir).not.toHaveBeenCalled();
    expect(salvar).not.toHaveBeenCalled();
  });
});

function criarService(
  nota: NotaServico | null,
  sucessoEmissao = true,
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
  const emissor: EmissorNotaServico = {
    emitir: vi.fn().mockResolvedValue(
      sucessoEmissao
        ? {
            sucesso: true,
            numeroNfse: '100',
            codigoVerificacao: 'ABC123',
            dataEmissao: new Date('2026-06-19T10:00:00.000Z'),
          }
        : {
            sucesso: false,
            mensagemErro: 'Falha simulada.',
          },
    ),
  };

  return {
    service: new EmitirNotaServicoService(
      notaRepository,
      emissor,
      new ValidarOperacaoSimuladaService(nodeEnv),
    ),
    salvar,
    buscarPorIdEEmpresaId,
    emissor,
  };
}

function criarNota(status = StatusNota.RASCUNHO): NotaServico {
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
    ...(status === StatusNota.EMITIDA
      ? {
          numeroNfse: '99',
          codigoVerificacao: 'XYZ',
          dataEmissao: new Date('2026-06-19T09:00:00.000Z'),
        }
      : {}),
  });
}
