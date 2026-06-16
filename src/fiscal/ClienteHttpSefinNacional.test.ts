import { describe, expect, it, vi } from 'vitest';

import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { ConfiguracaoSefinNacionalAusenteError } from '../errors/ConfiguracaoSefinNacionalAusenteError';
import { ClienteHttpSefinNacional } from './ClienteHttpSefinNacional';

const xmlAssinado = '<DPS><Signature>assinatura</Signature></DPS>';

describe('ClienteHttpSefinNacional', () => {
  it('deve enviar DPS assinada para a URL configurada e normalizar resposta de sucesso', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          protocolo: 'PROTOCOLO-123',
          chaveAcesso: 'CHAVE-456',
          numeroNfse: '789',
          codigoVerificacao: 'ABC123',
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    const cliente = new ClienteHttpSefinNacional(
      () => ({
        baseUrl: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
        endpointEnvioDps: '/DPS',
        timeoutMs: 1000,
      }),
      fetchMock,
    );

    const resultado = await cliente.enviarDpsAssinada({ xmlAssinado });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sefin.producaorestrita.nfse.gov.br/SefinNacional/DPS',
      expect.objectContaining({
        method: 'POST',
        body: xmlAssinado,
        headers: expect.objectContaining({
          'Content-Type': 'application/xml; charset=utf-8',
        }),
      }),
    );
    expect(resultado).toEqual({
      sucesso: true,
      statusHttp: 202,
      protocolo: 'PROTOCOLO-123',
      chaveAcesso: 'CHAVE-456',
      numeroNfse: '789',
      codigoVerificacao: 'ABC123',
      xmlAutorizado: undefined,
    });
  });

  it('deve retornar erros estruturados quando a SEFIN recusar a DPS', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          erros: [
            {
              codigo: 'E001',
              mensagem: 'DPS rejeitada.',
              campo: 'infDPS',
            },
          ],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    const cliente = new ClienteHttpSefinNacional(
      () => ({
        baseUrl: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional/',
        endpointEnvioDps: 'DPS',
      }),
      fetchMock,
    );

    const resultado = await cliente.enviarDpsAssinada({ xmlAssinado });

    expect(resultado).toEqual({
      sucesso: false,
      statusHttp: 400,
      erros: [
        {
          codigo: 'E001',
          mensagem: 'DPS rejeitada.',
          campo: 'infDPS',
        },
      ],
    });
  });

  it('deve exigir URL base da SEFIN Nacional', async () => {
    const cliente = new ClienteHttpSefinNacional(() => ({}), vi.fn());

    await expect(
      cliente.enviarDpsAssinada({ xmlAssinado }),
    ).rejects.toBeInstanceOf(ConfiguracaoSefinNacionalAusenteError);
  });

  it('deve tratar falha de rede sem expor o XML enviado', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('socket hang up'));
    const cliente = new ClienteHttpSefinNacional(
      () => ({
        baseUrl: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
      }),
      fetchMock,
    );

    await expect(
      cliente.enviarDpsAssinada({ xmlAssinado }),
    ).rejects.toMatchObject({
      message: 'Nao foi possivel comunicar com a SEFIN Nacional.',
    });
    await expect(
      cliente.enviarDpsAssinada({ xmlAssinado }),
    ).rejects.not.toThrow(xmlAssinado);
  });

  it('deve tratar timeout de forma controlada', async () => {
    const fetchMock = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    const cliente = new ClienteHttpSefinNacional(
      () => ({
        baseUrl: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
        timeoutMs: 1,
      }),
      fetchMock,
    );

    await expect(
      cliente.enviarDpsAssinada({ xmlAssinado }),
    ).rejects.toBeInstanceOf(ComunicacaoNfseError);
    await expect(
      cliente.enviarDpsAssinada({ xmlAssinado }),
    ).rejects.toMatchObject({
      message: 'Tempo limite excedido ao comunicar com a SEFIN Nacional.',
    });
  });
});
