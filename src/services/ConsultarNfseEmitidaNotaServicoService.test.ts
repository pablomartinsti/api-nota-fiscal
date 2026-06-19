import { describe, expect, it, vi } from 'vitest';

import {
  AmbienteFiscal,
  NotaServico,
  StatusNota,
} from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { ProducaoRealBloqueadaError } from '../errors/ProducaoRealBloqueadaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { ClienteNfseNacional } from '../fiscal/ClienteNfseNacional';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { ConsultarNfseEmitidaNotaServicoService } from './ConsultarNfseEmitidaNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

function criarNota(props?: {
  status?: StatusNota;
  chaveAcesso?: string;
  ambienteFiscal?: AmbienteFiscal;
}): NotaServico {
  const status = props?.status ?? StatusNota.EMITIDA;

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
    ambienteFiscal: props?.ambienteFiscal,
    ...(status === StatusNota.EMITIDA
      ? {
          numeroNfse: '100',
          dataEmissao: new Date('2026-06-16T10:00:00.000Z'),
          ...(props?.chaveAcesso
            ? {
                chaveAcesso: props.chaveAcesso,
              }
            : {
                codigoVerificacao: 'ABC123',
              }),
        }
      : {}),
  });
}

describe('ConsultarNfseEmitidaNotaServicoService', () => {
  it('deve consultar uma NFS-e emitida pela chave de acesso', async () => {
    const nota = criarNota({
      chaveAcesso: '12345678901234567890123456789012345678901234567890',
    });
    const { service, clienteNfse } = criarService(nota);

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(clienteNfse.consultarNfsePorChave).toHaveBeenCalledWith({
      ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
      chaveAcesso: '12345678901234567890123456789012345678901234567890',
    });
    expect(resultado).toEqual({
      notaId: 'nota-1',
      chaveAcesso: '12345678901234567890123456789012345678901234567890',
      sucesso: true,
      statusHttp: 200,
      tipoAmbiente: 2,
      versaoAplicativo: 'SefinNacional_1.0',
      dataHoraProcessamento: '2026-06-16T17:22:48.5541738-03:00',
      xmlAutorizado: '<NFSe>autorizada</NFSe>',
      erros: undefined,
    });
  });

  it('deve retornar erro fiscal quando a SEFIN nao encontrar a chave', async () => {
    const nota = criarNota({
      chaveAcesso: '12345678901234567890123456789012345678901234567890',
    });
    const { service, clienteNfse } = criarService(nota);
    clienteNfse.consultarNfsePorChave = vi.fn().mockResolvedValue({
      sucesso: false,
      statusHttp: 404,
      erros: [
        {
          codigo: 'E404',
          mensagem: 'Chave de acesso nao encontrada.',
        },
      ],
    });

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(resultado).toEqual({
      notaId: 'nota-1',
      chaveAcesso: '12345678901234567890123456789012345678901234567890',
      sucesso: false,
      statusHttp: 404,
      tipoAmbiente: undefined,
      versaoAplicativo: undefined,
      dataHoraProcessamento: undefined,
      xmlAutorizado: undefined,
      erros: [
        {
          codigo: 'E404',
          mensagem: 'Chave de acesso nao encontrada.',
        },
      ],
    });
  });

  it('nao deve consultar nota inexistente ou de outra empresa', async () => {
    const { service, clienteNfse } = criarService(null);

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(NotaServicoNaoEncontradaError);
    expect(clienteNfse.consultarNfsePorChave).not.toHaveBeenCalled();
  });

  it('nao deve consultar nota que ainda nao foi emitida', async () => {
    const { service, clienteNfse } = criarService(
      criarNota({ status: StatusNota.RASCUNHO }),
    );

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
    expect(clienteNfse.consultarNfsePorChave).not.toHaveBeenCalled();
  });

  it('nao deve consultar nota emitida sem chave de acesso', async () => {
    const { service, clienteNfse } = criarService(criarNota());

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
    expect(clienteNfse.consultarNfsePorChave).not.toHaveBeenCalled();
  });

  it('deve bloquear consulta de NFS-e em producao real sem permissao explicita', async () => {
    const { service, clienteNfse } = criarService(
      criarNota({
        chaveAcesso: '12345678901234567890123456789012345678901234567890',
        ambienteFiscal: AmbienteFiscal.PRODUCAO,
      }),
      false,
    );

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(ProducaoRealBloqueadaError);
    expect(clienteNfse.consultarNfsePorChave).not.toHaveBeenCalled();
  });

  it('deve bloquear consulta em producao real sem certificado proprio da empresa', async () => {
    const { service, clienteNfse } = criarService(
      criarNota({
        chaveAcesso: '12345678901234567890123456789012345678901234567890',
        ambienteFiscal: AmbienteFiscal.PRODUCAO,
      }),
    );

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(CertificadoA1EmpresaProducaoAusenteError);
    expect(clienteNfse.consultarNfsePorChave).not.toHaveBeenCalled();
  });
});

function criarService(
  nota: NotaServico | null,
  permitirProducaoReal = true,
  resolverConfiguracaoFiscal?: ResolverConfiguracaoFiscalEmpresaService,
): {
  service: ConsultarNfseEmitidaNotaServicoService;
  clienteNfse: ClienteNfseNacional;
} {
  const notaRepository: NotaServicoRepository = {
    salvar: vi.fn(),
    iniciarProcessamentoEnvio: vi.fn(),
    buscarPorIdEEmpresaId: vi.fn().mockResolvedValue(nota),
    listarPorEmpresaId: vi.fn(),
    buscarMaiorNumeroDpsPorEmpresaAmbienteESerie: vi.fn(),
  };
  const clienteNfse: ClienteNfseNacional = {
    enviarDpsAssinada: vi.fn(),
    consultarNfsePorChave: vi.fn().mockResolvedValue({
      sucesso: true,
      statusHttp: 200,
      tipoAmbiente: 2,
      versaoAplicativo: 'SefinNacional_1.0',
      dataHoraProcessamento: '2026-06-16T17:22:48.5541738-03:00',
      chaveAcesso: '12345678901234567890123456789012345678901234567890',
      xmlAutorizado: '<NFSe>autorizada</NFSe>',
    }),
    registrarEventoCancelamento: vi.fn(),
  };

  return {
    service: new ConsultarNfseEmitidaNotaServicoService(
      notaRepository,
      clienteNfse,
      resolverConfiguracaoFiscal,
      new ValidarPermissaoProducaoRealService(permitirProducaoReal),
    ),
    clienteNfse,
  };
}
