import { describe, expect, it, vi } from 'vitest';

import {
  AmbienteFiscal,
  CodigoMotivoSubstituicaoNfse,
  NotaServico,
  NotaServicoProps,
  StatusNota,
} from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { ProducaoRealBloqueadaError } from '../errors/ProducaoRealBloqueadaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { ClienteNfseNacional } from '../fiscal/ClienteNfseNacional';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { RegistrarEventoFiscalNotaServicoService } from './RegistrarEventoFiscalNotaServicoService';
import { ReconciliarEnvioDpsNotaServicoService } from './ReconciliarEnvioDpsNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

const chaveAcesso = '12345678901234567890123456789012345678901234567890';

describe('ReconciliarEnvioDpsNotaServicoService', () => {
  it('deve reconciliar uma nota com erro quando a SEFIN encontrar a NFS-e', async () => {
    const nota = criarNota(StatusNota.ERRO);
    const { service, clienteNfse, salvar, registrarEventoFiscal } =
      criarService(nota);

    const resultado = await service.executar(autenticacao, 'nota-1', {
      chaveAcesso,
    });

    expect(clienteNfse.consultarNfsePorChave).toHaveBeenCalledWith({
      ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
      chaveAcesso,
    });
    expect(salvar).toHaveBeenCalledOnce();
    expect(resultado.reconciliada).toBe(true);
    expect(resultado.nota.status).toBe(StatusNota.EMITIDA);
    expect(resultado.nota.chaveAcesso).toBe(chaveAcesso);
    expect(resultado.nota.xmlAutorizado).toBe('<NFSe>autorizada</NFSe>');
    expect(resultado.nota.mensagemErroFiscal).toBeUndefined();
    expect(registrarEventoFiscal.sucesso).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'RECONCILIACAO_ENVIO',
        statusHttp: 200,
        chaveAcesso,
      }),
    );
  });

  it('deve usar chave ja salva na nota quando o input nao informar chave', async () => {
    const nota = criarNota(StatusNota.PROCESSANDO, { chaveAcesso });
    const { service, clienteNfse } = criarService(nota);

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(clienteNfse.consultarNfsePorChave).toHaveBeenCalledWith({
      ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
      chaveAcesso,
    });
    expect(resultado.nota.status).toBe(StatusNota.EMITIDA);
  });

  it('deve registrar erro quando a SEFIN nao encontrar NFS-e para reconciliar', async () => {
    const nota = criarNota(StatusNota.PROCESSANDO, { chaveAcesso });
    const { service, clienteNfse, salvar, registrarEventoFiscal } =
      criarService(nota);
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

    expect(salvar).toHaveBeenCalledOnce();
    expect(resultado.reconciliada).toBe(false);
    expect(resultado.nota.status).toBe(StatusNota.ERRO);
    expect(resultado.nota.mensagemErroFiscal).toBe(
      'E404: Chave de acesso nao encontrada.',
    );
    expect(registrarEventoFiscal.erro).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'RECONCILIACAO_ENVIO',
        statusHttp: 404,
        mensagem: 'E404: Chave de acesso nao encontrada.',
      }),
    );
  });

  it('nao deve reconciliar nota inexistente, sem chave ou em status invalido', async () => {
    await expect(
      criarService(null).service.executar(autenticacao, 'nota-1', {
        chaveAcesso,
      }),
    ).rejects.toBeInstanceOf(NotaServicoNaoEncontradaError);

    await expect(
      criarService(criarNota(StatusNota.ERRO)).service.executar(
        autenticacao,
        'nota-1',
      ),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);

    await expect(
      criarService(criarNota(StatusNota.RASCUNHO)).service.executar(
        autenticacao,
        'nota-1',
        { chaveAcesso },
      ),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
  });

  it('deve bloquear reconciliacao em producao real sem permissao explicita', async () => {
    const nota = criarNota(StatusNota.ERRO, {
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
    });
    const { service, clienteNfse, salvar } = criarService(nota, false);

    await expect(
      service.executar(autenticacao, 'nota-1', { chaveAcesso }),
    ).rejects.toBeInstanceOf(ProducaoRealBloqueadaError);
    expect(clienteNfse.consultarNfsePorChave).not.toHaveBeenCalled();
    expect(salvar).not.toHaveBeenCalled();
  });

  it('deve bloquear producao real sem certificado proprio da empresa', async () => {
    const nota = criarNota(StatusNota.ERRO, {
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
    });
    const { service, clienteNfse, salvar } = criarService(nota);

    await expect(
      service.executar(autenticacao, 'nota-1', { chaveAcesso }),
    ).rejects.toBeInstanceOf(CertificadoA1EmpresaProducaoAusenteError);
    expect(clienteNfse.consultarNfsePorChave).not.toHaveBeenCalled();
    expect(salvar).not.toHaveBeenCalled();
  });

  it('deve consultar producao real usando certificado proprio da empresa', async () => {
    const nota = criarNota(StatusNota.ERRO, {
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
    });
    const resolverConfiguracaoFiscal = criarResolverComCertificadoEmpresa();
    const { service, clienteNfse } = criarService(
      nota,
      true,
      resolverConfiguracaoFiscal,
    );

    await service.executar(autenticacao, 'nota-1', { chaveAcesso });

    expect(clienteNfse.consultarNfsePorChave).toHaveBeenCalledWith({
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
      chaveAcesso,
      certificadoPath: 'C:/certificados/empresa.pfx',
      certificadoSenha: 'senha-empresa',
    });
  });

  it('deve marcar nota original como substituida ao reconciliar uma substituta', async () => {
    const notaOriginal = criarNota(StatusNota.EMITIDA, {
      id: 'nota-original-1',
      chaveAcesso,
    });
    const notaSubstituta = criarNota(StatusNota.ERRO, {
      id: 'nota-substituta-1',
      notaSubstituidaId: 'nota-original-1',
      chaveAcessoSubstituida: chaveAcesso,
      codigoMotivoSubstituicao: CodigoMotivoSubstituicaoNfse.OUTROS,
      motivoSubstituicao: 'Correcao de dados da NFS-e em homologacao',
    });
    const { service, buscarPorIdEEmpresaId, salvar } =
      criarService(notaSubstituta);

    buscarPorIdEEmpresaId.mockImplementation(async (id: string) => {
      if (id === 'nota-substituta-1') {
        return notaSubstituta;
      }

      if (id === 'nota-original-1') {
        return notaOriginal;
      }

      return null;
    });

    const resultado = await service.executar(
      autenticacao,
      'nota-substituta-1',
      { chaveAcesso },
    );

    expect(resultado.nota.status).toBe(StatusNota.EMITIDA);
    expect(salvar).toHaveBeenCalledTimes(2);
    expect(salvar.mock.calls[0][0].status).toBe(StatusNota.EMITIDA);
    expect(salvar.mock.calls[1][0].status).toBe(StatusNota.SUBSTITUIDA);
  });
});

function criarService(
  nota: NotaServico | null,
  permitirProducaoReal = true,
  resolverConfiguracaoFiscal?: ResolverConfiguracaoFiscalEmpresaService,
): {
  service: ReconciliarEnvioDpsNotaServicoService;
  clienteNfse: ClienteNfseNacional;
  salvar: ReturnType<typeof vi.fn>;
  buscarPorIdEEmpresaId: ReturnType<typeof vi.fn>;
  registrarEventoFiscal: {
    sucesso: ReturnType<typeof vi.fn>;
    erro: ReturnType<typeof vi.fn>;
  };
} {
  const salvar = vi.fn(async (notaParaSalvar: NotaServico) => notaParaSalvar);
  const buscarPorIdEEmpresaId = vi.fn().mockResolvedValue(nota);
  const notaRepository: NotaServicoRepository = {
    salvar,
    iniciarProcessamentoEnvio: vi.fn(),
    buscarPorIdEEmpresaId,
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
      dataHoraProcessamento: '2026-06-18T13:00:00.000-03:00',
      chaveAcesso,
      xmlAutorizado: '<NFSe>autorizada</NFSe>',
    }),
    registrarEventoCancelamento: vi.fn(),
  };
  const registrarEventoFiscal = {
    sucesso: vi.fn().mockResolvedValue(undefined),
    erro: vi.fn().mockResolvedValue(undefined),
  };

  return {
    service: new ReconciliarEnvioDpsNotaServicoService(
      notaRepository,
      clienteNfse,
      resolverConfiguracaoFiscal,
      new ValidarPermissaoProducaoRealService(permitirProducaoReal),
      registrarEventoFiscal as unknown as RegistrarEventoFiscalNotaServicoService,
    ),
    clienteNfse,
    salvar,
    buscarPorIdEEmpresaId,
    registrarEventoFiscal,
  };
}

function criarNota(
  status: StatusNota,
  props: Partial<NotaServicoProps> = {},
): NotaServico {
  const deveTerDadosFiscais = [
    StatusNota.EMITIDA,
    StatusNota.SUBSTITUIDA,
    StatusNota.CANCELADA,
  ].includes(status);

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
    ...(status === StatusNota.ERRO
      ? {
          mensagemErro: 'Timeout ao enviar DPS',
          mensagemErroFiscal: 'Timeout ao enviar DPS',
        }
      : {}),
    ...(deveTerDadosFiscais
      ? {
          numeroNfse: '100',
          protocoloEmissao: 'PROTOCOLO-123',
          chaveAcesso,
          dataEmissao: new Date('2026-06-16T10:00:00.000Z'),
        }
      : {}),
    ...props,
  });
}

function criarResolverComCertificadoEmpresa() {
  return {
    obterCertificadoA1ParaAmbiente: vi.fn().mockResolvedValue({
      caminho: 'C:/certificados/empresa.pfx',
      senha: 'senha-empresa',
    }),
  } as unknown as ResolverConfiguracaoFiscalEmpresaService;
}
