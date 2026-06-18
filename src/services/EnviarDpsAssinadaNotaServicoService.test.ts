import { describe, expect, it, vi } from 'vitest';

import {
  CodigoMotivoSubstituicaoNfse,
  AmbienteFiscal,
  NotaServico,
  NotaServicoProps,
  StatusNota,
} from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { ProducaoRealBloqueadaError } from '../errors/ProducaoRealBloqueadaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { ClienteNfseNacional } from '../fiscal/ClienteNfseNacional';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { GerarXmlDpsAssinadoNotaServicoService } from './GerarXmlDpsAssinadoNotaServicoService';
import { EnviarDpsAssinadaNotaServicoService } from './EnviarDpsAssinadaNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

function criarNota(
  status = StatusNota.RASCUNHO,
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
    ...(deveTerDadosFiscais
      ? {
          numeroNfse: '100',
          codigoVerificacao: 'ABC123',
          dataEmissao: new Date('2026-06-16T10:00:00.000Z'),
        }
      : {}),
    ...props,
  });
}

describe('EnviarDpsAssinadaNotaServicoService', () => {
  it('deve enviar XML assinado e salvar sucesso fiscal', async () => {
    const nota = criarNota();
    const { service, gerarXml, clienteNfse, salvar } = criarService(nota);

    clienteNfse.enviarDpsAssinada = vi.fn().mockResolvedValue({
      sucesso: true,
      statusHttp: 202,
      protocolo: 'PROTOCOLO-123',
      chaveAcesso: 'CHAVE-456',
      numeroNfse: '100',
      codigoVerificacao: 'ABC123',
      xmlAutorizado: '<NFS-e>autorizada</NFS-e>',
    });

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(gerarXml.executar).toHaveBeenCalledWith(autenticacao, 'nota-1');
    expect(clienteNfse.enviarDpsAssinada).toHaveBeenCalledWith({
      xmlAssinado: '<DPS>assinado</DPS>',
    });
    expect(salvar).toHaveBeenCalledOnce();
    expect(resultado.status).toBe(StatusNota.EMITIDA);
    expect(resultado.numeroNfse).toBe('100');
    expect(resultado.codigoVerificacao).toBe('ABC123');
    expect(resultado.protocoloEmissao).toBe('PROTOCOLO-123');
    expect(resultado.chaveAcesso).toBe('CHAVE-456');
    expect(resultado.xmlAutorizado).toBe('<NFS-e>autorizada</NFS-e>');
    expect(resultado.mensagemErroFiscal).toBeUndefined();
  });

  it('deve salvar erro fiscal quando a SEFIN rejeitar a DPS', async () => {
    const nota = criarNota();
    const { service, clienteNfse } = criarService(nota);

    clienteNfse.enviarDpsAssinada = vi.fn().mockResolvedValue({
      sucesso: false,
      statusHttp: 400,
      erros: [
        {
          codigo: 'E001',
          campo: 'infDPS',
          mensagem: 'DPS rejeitada.',
        },
      ],
    });

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(resultado.status).toBe(StatusNota.ERRO);
    expect(resultado.mensagemErroFiscal).toBe(
      'E001 infDPS: DPS rejeitada.',
    );
  });

  it('deve salvar erro fiscal quando sucesso vier sem protocolo e sem chave', async () => {
    const nota = criarNota();
    const { service, clienteNfse } = criarService(nota);

    clienteNfse.enviarDpsAssinada = vi.fn().mockResolvedValue({
      sucesso: true,
      statusHttp: 202,
      numeroNfse: '100',
    });

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(resultado.status).toBe(StatusNota.ERRO);
    expect(resultado.mensagemErroFiscal).toBe(
      'Retorno fiscal da SEFIN nao informou protocolo ou chave de acesso.',
    );
  });

  it('deve marcar nota original como substituida ao emitir substituta', async () => {
    const notaOriginal = criarNota(StatusNota.EMITIDA, {
      id: 'nota-original-1',
      chaveAcesso: '12345678901234567890123456789012345678901234567890',
    });
    const notaSubstituta = criarNota(StatusNota.RASCUNHO, {
      id: 'nota-substituta-1',
      notaSubstituidaId: 'nota-original-1',
      chaveAcessoSubstituida:
        '12345678901234567890123456789012345678901234567890',
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
    );

    expect(resultado.status).toBe(StatusNota.EMITIDA);
    expect(salvar).toHaveBeenCalledTimes(2);
    expect(salvar.mock.calls[0][0].status).toBe(StatusNota.EMITIDA);
    expect(salvar.mock.calls[1][0].status).toBe(StatusNota.SUBSTITUIDA);
    expect(notaOriginal.status).toBe(StatusNota.SUBSTITUIDA);
  });

  it('nao deve enviar substituta quando nota original nao esta emitida', async () => {
    const notaOriginal = criarNota(StatusNota.CANCELADA, {
      id: 'nota-original-1',
      chaveAcesso: '12345678901234567890123456789012345678901234567890',
    });
    const notaSubstituta = criarNota(StatusNota.RASCUNHO, {
      id: 'nota-substituta-1',
      notaSubstituidaId: 'nota-original-1',
      chaveAcessoSubstituida:
        '12345678901234567890123456789012345678901234567890',
      codigoMotivoSubstituicao: CodigoMotivoSubstituicaoNfse.OUTROS,
      motivoSubstituicao: 'Correcao de dados da NFS-e em homologacao',
    });
    const { service, buscarPorIdEEmpresaId, clienteNfse, salvar } =
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

    await expect(
      service.executar(autenticacao, 'nota-substituta-1'),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
    expect(clienteNfse.enviarDpsAssinada).not.toHaveBeenCalled();
    expect(salvar).not.toHaveBeenCalled();
  });

  it('nao deve enviar nota inexistente ou de outra empresa', async () => {
    const { service, clienteNfse } = criarService(null);

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(NotaServicoNaoEncontradaError);
    expect(clienteNfse.enviarDpsAssinada).not.toHaveBeenCalled();
  });

  it('nao deve enviar nota fora de rascunho', async () => {
    const { service, clienteNfse } = criarService(criarNota(StatusNota.EMITIDA));

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
    expect(clienteNfse.enviarDpsAssinada).not.toHaveBeenCalled();
  });

  it('deve registrar erro fiscal quando houver falha de comunicacao', async () => {
    const nota = criarNota();
    const { service, clienteNfse, salvar } = criarService(nota);

    clienteNfse.enviarDpsAssinada = vi
      .fn()
      .mockRejectedValue(new ComunicacaoNfseError());

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(salvar).toHaveBeenCalledOnce();
    expect(resultado.status).toBe(StatusNota.ERRO);
    expect(resultado.mensagemErroFiscal).toBe(
      'Nao foi possivel comunicar com a SEFIN Nacional.',
    );
  });

  it('deve bloquear novo envio quando a nota ja estiver em processamento', async () => {
    const nota = criarNota(StatusNota.PROCESSANDO);
    const { service, clienteNfse, gerarXml } = criarService(nota);

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
    expect(gerarXml.executar).not.toHaveBeenCalled();
    expect(clienteNfse.enviarDpsAssinada).not.toHaveBeenCalled();
  });

  it('deve bloquear envio de DPS em producao real sem permissao explicita', async () => {
    const nota = criarNota(StatusNota.RASCUNHO, {
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
    });
    const { service, clienteNfse, gerarXml, salvar } = criarService(
      nota,
      false,
    );

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(ProducaoRealBloqueadaError);
    expect(gerarXml.executar).not.toHaveBeenCalled();
    expect(clienteNfse.enviarDpsAssinada).not.toHaveBeenCalled();
    expect(salvar).not.toHaveBeenCalled();
  });

  it('deve bloquear producao real sem certificado proprio da empresa', async () => {
    const nota = criarNota(StatusNota.RASCUNHO, {
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
    });
    const { service, clienteNfse, gerarXml, salvar } = criarService(nota);

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(CertificadoA1EmpresaProducaoAusenteError);
    expect(gerarXml.executar).not.toHaveBeenCalled();
    expect(clienteNfse.enviarDpsAssinada).not.toHaveBeenCalled();
    expect(salvar).not.toHaveBeenCalled();
  });

  it('deve permitir producao real com certificado proprio da empresa', async () => {
    const nota = criarNota(StatusNota.RASCUNHO, {
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
    });
    const resolverConfiguracaoFiscal =
      criarResolverComCertificadoEmpresa();
    const { service, clienteNfse } = criarService(
      nota,
      true,
      resolverConfiguracaoFiscal,
    );

    await service.executar(autenticacao, 'nota-1');

    expect(clienteNfse.enviarDpsAssinada).toHaveBeenCalledWith({
      xmlAssinado: '<DPS>assinado</DPS>',
      certificadoPath: 'C:/certificados/empresa.pfx',
      certificadoSenha: 'senha-empresa',
    });
  });
});

function criarService(
  nota: NotaServico | null,
  permitirProducaoReal = true,
  resolverConfiguracaoFiscal?: ResolverConfiguracaoFiscalEmpresaService,
): {
  service: EnviarDpsAssinadaNotaServicoService;
  gerarXml: GerarXmlDpsAssinadoNotaServicoService;
  clienteNfse: ClienteNfseNacional;
  salvar: ReturnType<typeof vi.fn>;
  buscarPorIdEEmpresaId: ReturnType<typeof vi.fn>;
} {
  const salvar = vi.fn(async (notaParaSalvar: NotaServico) => notaParaSalvar);
  const buscarPorIdEEmpresaId = vi.fn().mockResolvedValue(nota);
  const iniciarProcessamentoEnvio = vi.fn(
    async (id: string, empresaId: string) => {
      const notaAtual = await buscarPorIdEEmpresaId(id, empresaId);

      if (!notaAtual || notaAtual.status !== StatusNota.RASCUNHO) {
        return null;
      }

      notaAtual.iniciarProcessamentoFiscal();

      return notaAtual;
    },
  );
  const notaRepository: NotaServicoRepository = {
    salvar,
    iniciarProcessamentoEnvio,
    buscarPorIdEEmpresaId,
    listarPorEmpresaId: vi.fn(),
    buscarMaiorNumeroDpsPorEmpresaAmbienteESerie: vi.fn(),
  };
  const gerarXml = {
    executar: vi.fn().mockResolvedValue('<DPS>assinado</DPS>'),
  } as unknown as GerarXmlDpsAssinadoNotaServicoService;
  const clienteNfse: ClienteNfseNacional = {
    enviarDpsAssinada: vi.fn().mockResolvedValue({
      sucesso: true,
      statusHttp: 202,
      protocolo: 'PROTOCOLO-123',
      chaveAcesso: 'CHAVE-456',
      numeroNfse: '100',
      codigoVerificacao: 'ABC123',
    }),
    consultarNfsePorChave: vi.fn(),
    registrarEventoCancelamento: vi.fn(),
  };

  return {
    service: new EnviarDpsAssinadaNotaServicoService(
      notaRepository,
      gerarXml,
      clienteNfse,
      resolverConfiguracaoFiscal,
      new ValidarPermissaoProducaoRealService(permitirProducaoReal),
    ),
    gerarXml,
    clienteNfse,
    salvar,
    buscarPorIdEEmpresaId,
  };
}

function criarResolverComCertificadoEmpresa() {
  return {
    obterCertificadoA1ParaAmbiente: vi.fn().mockResolvedValue({
      caminho: 'C:/certificados/empresa.pfx',
      senha: 'senha-empresa',
    }),
  } as unknown as ResolverConfiguracaoFiscalEmpresaService;
}
