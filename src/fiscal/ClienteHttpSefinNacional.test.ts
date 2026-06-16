import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

import { describe, expect, it, vi } from 'vitest';

import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { ConfiguracaoFiscalAusenteError } from '../errors/ConfiguracaoFiscalAusenteError';
import { ConfiguracaoSefinNacionalAusenteError } from '../errors/ConfiguracaoSefinNacionalAusenteError';
import {
  ClienteHttpSefinNacional,
  ConfiguracaoClienteHttpSefinNacional,
  TransportadorHttpSefinNacional,
} from './ClienteHttpSefinNacional';

const xmlAssinado = '<DPS><Signature>assinatura</Signature></DPS>';
const xmlNfseAutorizada =
  '<NFSe><infNFSe><nNFSe>789</nNFSe></infNFSe></NFSe>';

describe('ClienteHttpSefinNacional', () => {
  it('deve enviar DPS assinada com certificado cliente e normalizar resposta de sucesso', async () => {
    const certificado = criarCertificadoTeste();
    const nfseXmlGZipB64 = gzipSync(
      Buffer.from(xmlNfseAutorizada, 'utf8'),
    ).toString('base64');
    const transportador = vi.fn<TransportadorHttpSefinNacional>().mockResolvedValue({
      status: 201,
      body: JSON.stringify({
        idDps: 'DPS-123',
        chaveAcesso: 'CHAVE-456',
        nfseXmlGZipB64,
      }),
    });
    const cliente = criarClienteTeste(transportador, {
      certificadoPath: certificado.caminho,
      certificadoSenha: 'senha-teste',
      timeoutMs: 1000,
    });

    try {
      const resultado = await cliente.enviarDpsAssinada({ xmlAssinado });

      expect(transportador).toHaveBeenCalledOnce();
      const requisicao = transportador.mock.calls[0][0];
      expect(requisicao.url).toBe(
        'https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse',
      );
      expect(requisicao.method).toBe('POST');
      expect(requisicao.timeoutMs).toBe(1000);
      expect(requisicao.certificadoPfx).toEqual(certificado.conteudo);
      expect(requisicao.certificadoSenha).toBe('senha-teste');
      expect(requisicao.headers).toEqual(
        expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
        }),
      );

      const body = JSON.parse(requisicao.body) as { dpsXmlGZipB64: string };
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
    } finally {
      certificado.limpar();
    }
  });

  it('deve retornar erros estruturados quando a SEFIN recusar a DPS', async () => {
    const certificado = criarCertificadoTeste();
    const transportador = vi.fn<TransportadorHttpSefinNacional>().mockResolvedValue({
      status: 400,
      body: JSON.stringify({
        erros: [
          {
            codigo: 'E001',
            mensagem: 'DPS rejeitada.',
            campo: 'infDPS',
          },
        ],
      }),
    });
    const cliente = criarClienteTeste(transportador, {
      certificadoPath: certificado.caminho,
      certificadoSenha: 'senha-teste',
    });

    try {
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
    } finally {
      certificado.limpar();
    }
  });

  it('deve exigir URL base HTTPS da SEFIN Nacional', async () => {
    const transportador = vi.fn<TransportadorHttpSefinNacional>();
    const cliente = new ClienteHttpSefinNacional(
      () => ({
        baseUrl: 'http://sefin.producaorestrita.nfse.gov.br/SefinNacional',
        endpointEnvioDps: 'nfse',
        certificadoPath: 'certificado.pfx',
        certificadoSenha: 'senha',
      }),
      transportador,
    );

    await expect(
      cliente.enviarDpsAssinada({ xmlAssinado }),
    ).rejects.toBeInstanceOf(ConfiguracaoSefinNacionalAusenteError);
    expect(transportador).not.toHaveBeenCalled();
  });

  it('deve exigir certificado A1 para autenticacao mutua TLS', async () => {
    const transportador = vi.fn<TransportadorHttpSefinNacional>();
    const cliente = criarClienteTeste(transportador, {
      certificadoPath: undefined,
      certificadoSenha: 'senha',
    });

    await expect(
      cliente.enviarDpsAssinada({ xmlAssinado }),
    ).rejects.toBeInstanceOf(ConfiguracaoFiscalAusenteError);
    expect(transportador).not.toHaveBeenCalled();
  });

  it('deve tratar falha de rede sem expor o XML enviado', async () => {
    const certificado = criarCertificadoTeste();
    const transportador = vi
      .fn<TransportadorHttpSefinNacional>()
      .mockRejectedValue(new Error('socket hang up'));
    const cliente = criarClienteTeste(transportador, {
      certificadoPath: certificado.caminho,
      certificadoSenha: 'senha-teste',
    });

    try {
      await expect(
        cliente.enviarDpsAssinada({ xmlAssinado }),
      ).rejects.toMatchObject({
        message: 'Nao foi possivel comunicar com a SEFIN Nacional.',
      });
      await expect(
        cliente.enviarDpsAssinada({ xmlAssinado }),
      ).rejects.not.toThrow(xmlAssinado);
    } finally {
      certificado.limpar();
    }
  });

  it('deve tratar timeout de forma controlada', async () => {
    const certificado = criarCertificadoTeste();
    const erroTimeout = new Error('Aborted');
    erroTimeout.name = 'AbortError';
    const transportador = vi
      .fn<TransportadorHttpSefinNacional>()
      .mockRejectedValue(erroTimeout);
    const cliente = criarClienteTeste(transportador, {
      certificadoPath: certificado.caminho,
      certificadoSenha: 'senha-teste',
      timeoutMs: 1,
    });

    try {
      await expect(
        cliente.enviarDpsAssinada({ xmlAssinado }),
      ).rejects.toBeInstanceOf(ComunicacaoNfseError);
      await expect(
        cliente.enviarDpsAssinada({ xmlAssinado }),
      ).rejects.toMatchObject({
        message: 'Tempo limite excedido ao comunicar com a SEFIN Nacional.',
      });
    } finally {
      certificado.limpar();
    }
  });
});

function criarClienteTeste(
  transportador: TransportadorHttpSefinNacional,
  configuracao: Partial<ConfiguracaoClienteHttpSefinNacional>,
): ClienteHttpSefinNacional {
  return new ClienteHttpSefinNacional(
    () => ({
      baseUrl: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
      endpointEnvioDps: 'nfse',
      ...configuracao,
    }),
    transportador,
  );
}

function criarCertificadoTeste(): {
  caminho: string;
  conteudo: Buffer;
  limpar: () => void;
} {
  const pasta = mkdtempSync(join(tmpdir(), 'nfse-certificado-'));
  const caminho = join(pasta, 'certificado.pfx');
  const conteudo = Buffer.from('conteudo-pfx-falso');

  writeFileSync(caminho, conteudo);

  return {
    caminho,
    conteudo,
    limpar: () => rmSync(pasta, { recursive: true, force: true }),
  };
}
