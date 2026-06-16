import { describe, expect, it, vi } from 'vitest';

import { NotaServico, StatusNota } from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { ClienteNfseNacional } from '../fiscal/ClienteNfseNacional';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { GerarXmlDpsAssinadoNotaServicoService } from './GerarXmlDpsAssinadoNotaServicoService';
import { EnviarDpsAssinadaNotaServicoService } from './EnviarDpsAssinadaNotaServicoService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

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
          numeroNfse: '100',
          codigoVerificacao: 'ABC123',
          dataEmissao: new Date('2026-06-16T10:00:00.000Z'),
        }
      : {}),
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

  it('deve salvar erro fiscal quando sucesso vier incompleto', async () => {
    const nota = criarNota();
    const { service, clienteNfse } = criarService(nota);

    clienteNfse.enviarDpsAssinada = vi.fn().mockResolvedValue({
      sucesso: true,
      statusHttp: 202,
      protocolo: 'PROTOCOLO-123',
    });

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(resultado.status).toBe(StatusNota.ERRO);
    expect(resultado.mensagemErroFiscal).toBe(
      'Retorno fiscal da SEFIN nao informou numero da NFS-e ou codigo de verificacao.',
    );
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

  it('deve propagar falha de comunicacao sem salvar a nota', async () => {
    const nota = criarNota();
    const { service, clienteNfse, salvar } = criarService(nota);

    clienteNfse.enviarDpsAssinada = vi
      .fn()
      .mockRejectedValue(new ComunicacaoNfseError());

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(ComunicacaoNfseError);
    expect(salvar).not.toHaveBeenCalled();
  });
});

function criarService(nota: NotaServico | null): {
  service: EnviarDpsAssinadaNotaServicoService;
  gerarXml: GerarXmlDpsAssinadoNotaServicoService;
  clienteNfse: ClienteNfseNacional;
  salvar: ReturnType<typeof vi.fn>;
} {
  const salvar = vi.fn(async (notaParaSalvar: NotaServico) => notaParaSalvar);
  const notaRepository: NotaServicoRepository = {
    salvar,
    buscarPorIdEEmpresaId: vi.fn().mockResolvedValue(nota),
    listarPorEmpresaId: vi.fn(),
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
  };

  return {
    service: new EnviarDpsAssinadaNotaServicoService(
      notaRepository,
      gerarXml,
      clienteNfse,
    ),
    gerarXml,
    clienteNfse,
    salvar,
  };
}
