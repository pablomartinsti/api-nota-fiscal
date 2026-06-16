import { gzipSync, gunzipSync } from 'node:zlib';

import { describe, expect, it, vi } from 'vitest';

import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { ConfiguracaoSefinNacionalAusenteError } from '../errors/ConfiguracaoSefinNacionalAusenteError';
import { ClienteHttpSefinNacional } from './ClienteHttpSefinNacional';

const xmlAssinado = '<DPS><Signature>assinatura</Signature></DPS>';
const xmlNfseAutorizada =
  '<NFSe><infNFSe><nNFSe>789</nNFSe></infNFSe></NFSe>';

describe('ClienteHttpSefinNacional', () => {
  it('deve enviar DPS assinada no formato oficial e normalizar resposta de sucesso', async () => {
    const nfseXmlGZipB64 = gzipSync(
      Buffer.from(xmlNfseAutorizada, 'utf8'),
    ).toString('base64');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          idDps: 'DPS-123',
          chaveAcesso: 'CHAVE-456',
          nfseXmlGZipB64,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    const cliente = new ClienteHttpSefinNacional(
      () => ({
        baseUrl: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
        endpointEnvioDps: '/nfse',
        timeoutMs: 1000,
      }),
      fetchMock,
    );

    const resultado = await cliente.enviarDpsAssinada({ xmlAssinado });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse',
    );
    expect(init).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json; charset=utf-8',
        }),
      }),
    );
    const body = JSON.parse(init?.body as string) as { dpsXmlGZipB64: string };
    expect(
      gunzipSync(Buffer.from(body.dpsXmlGZipB64, 'base64')).toString('utf8'),
    ).toBe(xmlAssinado);
    expect(resultado).toEqual({
      sucesso: true,
      statusHttp: 201,
      protocolo: 'DPS-123',
      chaveAcesso: 'CHAVE-456',
      numeroNfse: '789',
      codigoVerificacao: undefined,
      xmlAutorizado: xmlNfseAutorizada,
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
        endpointEnvioDps: 'nfse',
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
