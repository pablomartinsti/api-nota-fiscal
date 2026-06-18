import { describe, expect, it, vi } from 'vitest';

import {
  CodigoMotivoSubstituicaoNfse,
  NotaServico,
  StatusNota,
} from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { CriarRascunhoSubstituicaoNotaServicoService } from './CriarRascunhoSubstituicaoNotaServicoService';
import { GerarProximoNumeroDpsService } from './GerarProximoNumeroDpsService';
import { ValidarReferenciasNotaServicoService } from './ValidarReferenciasNotaServicoService';

const autenticacao = {
  usuarioId: 'usuario-2',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

const chaveAcesso = '12345678901234567890123456789012345678901234567890';

describe('CriarRascunhoSubstituicaoNotaServicoService', () => {
  it('deve criar rascunho de substituicao a partir de nota emitida', async () => {
    const notaSubstituida = criarNotaEmitida();
    const { service, salvar, validarReferencias } = criarService(
      notaSubstituida,
    );

    const resultado = await service.executar(
      autenticacao,
      'nota-original-1',
      {
        clienteId: 'cliente-2',
        servicoId: 'servico-2',
        valorServico: 700,
        descricao: 'Servico corrigido',
        serieDps: '1',
        dataCompetencia: new Date('2026-06-17T00:00:00.000Z'),
        codigoMunicipioPrestacao: '3170206',
        codigoMotivoSubstituicao: CodigoMotivoSubstituicaoNfse.OUTROS,
        motivoSubstituicao: 'Correcao de dados da NFS-e em homologacao',
      },
    );

    expect(validarReferencias.executar).toHaveBeenCalledWith(
      'empresa-1',
      'cliente-2',
      'servico-2',
    );
    expect(salvar).toHaveBeenCalledOnce();
    expect(resultado.status).toBe(StatusNota.RASCUNHO);
    expect(resultado.usuarioId).toBe('usuario-2');
    expect(resultado.clienteId).toBe('cliente-2');
    expect(resultado.servicoId).toBe('servico-2');
    expect(resultado.aliquotaIss).toBe(2);
    expect(resultado.serieDps).toBe('1');
    expect(resultado.numeroDps).toBe('2');
    expect(resultado.notaSubstituidaId).toBe('nota-original-1');
    expect(resultado.chaveAcessoSubstituida).toBe(chaveAcesso);
    expect(resultado.codigoMotivoSubstituicao).toBe('99');
    expect(resultado.motivoSubstituicao).toBe(
      'Correcao de dados da NFS-e em homologacao',
    );
    expect(notaSubstituida.status).toBe(StatusNota.EMITIDA);
  });

  it('nao deve substituir nota inexistente, cancelada ou sem chave', async () => {
    await expect(
      criarService(null).service.executar(
        autenticacao,
        'nota-original-1',
        dadosSubstituicao(),
      ),
    ).rejects.toBeInstanceOf(NotaServicoNaoEncontradaError);

    await expect(
      criarService(criarNotaCancelada()).service.executar(
        autenticacao,
        'nota-original-1',
        dadosSubstituicao(),
      ),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);

    await expect(
      criarService(criarNotaEmitidaSemChave()).service.executar(
        autenticacao,
        'nota-original-1',
        dadosSubstituicao(),
      ),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
  });
});

function criarService(notaSubstituida: NotaServico | null) {
  const salvar = vi.fn(async (nota: NotaServico) => nota);
  const notaRepository: NotaServicoRepository = {
    salvar,
    buscarPorIdEEmpresaId: vi.fn().mockResolvedValue(notaSubstituida),
    listarPorEmpresaId: vi.fn(),
    buscarMaiorNumeroDpsPorEmpresaAmbienteESerie:
      vi.fn().mockResolvedValue(1),
  };
  const validarReferencias = {
    executar: vi.fn().mockResolvedValue({
      servico: {
        aliquotaIss: 2,
      },
    }),
  } as unknown as ValidarReferenciasNotaServicoService;

  return {
    service: new CriarRascunhoSubstituicaoNotaServicoService(
      notaRepository,
      validarReferencias,
      new GerarProximoNumeroDpsService(notaRepository),
    ),
    salvar,
    validarReferencias,
  };
}

function dadosSubstituicao() {
  return {
    clienteId: 'cliente-2',
    servicoId: 'servico-2',
    valorServico: 700,
    descricao: 'Servico corrigido',
    serieDps: '1',
    numeroDps: '2',
    dataCompetencia: new Date('2026-06-17T00:00:00.000Z'),
    codigoMunicipioPrestacao: '3170206',
    codigoMotivoSubstituicao: CodigoMotivoSubstituicaoNfse.OUTROS,
    motivoSubstituicao: 'Correcao de dados da NFS-e em homologacao',
  };
}

function criarNotaEmitida(): NotaServico {
  return new NotaServico({
    id: 'nota-original-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    valorServico: 500,
    aliquotaIss: 2,
    descricao: 'Servico original',
    status: StatusNota.EMITIDA,
    numeroNfse: '1',
    protocoloEmissao: 'NFS123',
    chaveAcesso,
    dataEmissao: new Date('2026-06-17T12:00:00.000Z'),
  });
}

function criarNotaCancelada(): NotaServico {
  return new NotaServico({
    id: 'nota-original-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    valorServico: 500,
    aliquotaIss: 2,
    descricao: 'Servico original',
    status: StatusNota.CANCELADA,
    numeroNfse: '1',
    protocoloEmissao: 'NFS123',
    chaveAcesso,
    dataEmissao: new Date('2026-06-17T12:00:00.000Z'),
  });
}

function criarNotaEmitidaSemChave(): NotaServico {
  return new NotaServico({
    id: 'nota-original-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    valorServico: 500,
    aliquotaIss: 2,
    descricao: 'Servico original',
    status: StatusNota.EMITIDA,
    numeroNfse: '1',
    codigoVerificacao: 'ABC123',
    dataEmissao: new Date('2026-06-17T12:00:00.000Z'),
  });
}
