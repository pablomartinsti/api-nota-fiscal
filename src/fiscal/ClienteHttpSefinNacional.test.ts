import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

import forge from 'node-forge';
import { describe, expect, it, vi } from 'vitest';

import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { ConfiguracaoFiscalAusenteError } from '../errors/ConfiguracaoFiscalAusenteError';
import { ConfiguracaoSefinNacionalAusenteError } from '../errors/ConfiguracaoSefinNacionalAusenteError';
import { AmbienteFiscal } from '../entities/NotaServico';
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
      const resultado = await cliente.enviarDpsAssinada({
        ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
        xmlAssinado,
      });

      expect(transportador).toHaveBeenCalledOnce();
      const requisicao = transportador.mock.calls[0][0];
      expect(requisicao.url).toBe(
        'https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse',
      );
      expect(requisicao.method).toBe('POST');
      expect(requisicao.timeoutMs).toBe(1000);
      expect(requisicao.chavePrivadaPem).toContain('BEGIN RSA PRIVATE KEY');
      expect(requisicao.certificadoPem).toContain('BEGIN CERTIFICATE');
      expect(requisicao.headers).toEqual(
        expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
        }),
      );

      expect(requisicao.body).toBeDefined();
      const body = JSON.parse(requisicao.body!) as { dpsXmlGZipB64: string };
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

  it('deve escolher a URL da SEFIN conforme o ambiente fiscal', async () => {
    const certificado = criarCertificadoTeste();
    const transportador = vi.fn<TransportadorHttpSefinNacional>().mockResolvedValue({
      status: 201,
      body: JSON.stringify({
        idDps: 'DPS-123',
        chaveAcesso: 'CHAVE-456',
      }),
    });
    const cliente = criarClienteTeste(transportador, {
      certificadoPath: certificado.caminho,
      certificadoSenha: 'senha-teste',
    });

    try {
      await cliente.enviarDpsAssinada({
        ambienteFiscal: AmbienteFiscal.PRODUCAO,
        xmlAssinado,
      });

      expect(transportador).toHaveBeenCalledOnce();
      expect(transportador.mock.calls[0][0].url).toBe(
        'https://sefin.nfse.gov.br/SefinNacional/nfse',
      );
    } finally {
      certificado.limpar();
    }
  });

  it('deve consultar NFS-e pela chave de acesso usando certificado cliente', async () => {
    const certificado = criarCertificadoTeste();
    const nfseXmlGZipB64 = gzipSync(
      Buffer.from(xmlNfseAutorizada, 'utf8'),
    ).toString('base64');
    const transportador = vi.fn<TransportadorHttpSefinNacional>().mockResolvedValue({
      status: 200,
      body: JSON.stringify({
        tipoAmbiente: 2,
        versaoAplicativo: 'SefinNacional_1.0',
        dataHoraProcessamento: '2026-06-16T17:22:48.5541738-03:00',
        chaveAcesso: '12345678901234567890123456789012345678901234567890',
        nfseXmlGZipB64,
      }),
    });
    const cliente = criarClienteTeste(transportador, {
      certificadoPath: certificado.caminho,
      certificadoSenha: 'senha-teste',
      timeoutMs: 1000,
    });

    try {
      const resultado = await cliente.consultarNfsePorChave({
        ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
        chaveAcesso: '12345678901234567890123456789012345678901234567890',
      });

      expect(transportador).toHaveBeenCalledOnce();
      const requisicao = transportador.mock.calls[0][0];
      expect(requisicao.url).toBe(
        'https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse/12345678901234567890123456789012345678901234567890',
      );
      expect(requisicao.method).toBe('GET');
      expect(requisicao.body).toBeUndefined();
      expect(requisicao.headers).toEqual({
        Accept: 'application/json',
      });
      expect(requisicao.chavePrivadaPem).toContain('BEGIN RSA PRIVATE KEY');
      expect(requisicao.certificadoPem).toContain('BEGIN CERTIFICATE');
      expect(resultado).toEqual({
        sucesso: true,
        statusHttp: 200,
        tipoAmbiente: 2,
        versaoAplicativo: 'SefinNacional_1.0',
        dataHoraProcessamento: '2026-06-16T17:22:48.5541738-03:00',
        chaveAcesso: '12345678901234567890123456789012345678901234567890',
        xmlAutorizado: xmlNfseAutorizada,
      });
    } finally {
      certificado.limpar();
    }
  });

  it('deve registrar evento de cancelamento com XML assinado e certificado cliente', async () => {
    const certificado = criarCertificadoTeste();
    const xmlEvento = '<evento><infEvento>cancelado</infEvento></evento>';
    const eventoXmlGZipB64 = gzipSync(
      Buffer.from(xmlEvento, 'utf8'),
    ).toString('base64');
    const transportador = vi.fn<TransportadorHttpSefinNacional>().mockResolvedValue({
      status: 201,
      body: JSON.stringify({
        tipoAmbiente: 2,
        versaoAplicativo: 'SefinNacional_1.0',
        dataHoraProcessamento: '2026-06-16T17:22:48.5541738-03:00',
        eventoXmlGZipB64,
      }),
    });
    const cliente = criarClienteTeste(transportador, {
      certificadoPath: certificado.caminho,
      certificadoSenha: 'senha-teste',
      timeoutMs: 1000,
    });

    try {
      const resultado = await cliente.registrarEventoCancelamento({
        ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
        chaveAcesso: '12345678901234567890123456789012345678901234567890',
        xmlPedidoEventoAssinado: '<pedRegEvento>assinado</pedRegEvento>',
      });

      expect(transportador).toHaveBeenCalledOnce();
      const requisicao = transportador.mock.calls[0][0];
      expect(requisicao.url).toBe(
        'https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse/12345678901234567890123456789012345678901234567890/eventos',
      );
      expect(requisicao.method).toBe('POST');
      expect(requisicao.headers).toEqual(
        expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
        }),
      );
      const body = JSON.parse(requisicao.body!) as {
        pedidoRegistroEventoXmlGZipB64: string;
      };
      expect(
        gunzipSync(
          Buffer.from(body.pedidoRegistroEventoXmlGZipB64, 'base64'),
        ).toString('utf8'),
      ).toBe('<pedRegEvento>assinado</pedRegEvento>');
      expect(resultado).toEqual({
        sucesso: true,
        statusHttp: 201,
        tipoAmbiente: 2,
        versaoAplicativo: 'SefinNacional_1.0',
        dataHoraProcessamento: '2026-06-16T17:22:48.5541738-03:00',
        xmlEvento,
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
      const resultado = await cliente.enviarDpsAssinada({
        ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
        xmlAssinado,
      });

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

  it('deve normalizar erros da SEFIN com descricao e complemento', async () => {
    const certificado = criarCertificadoTeste();
    const transportador = vi.fn<TransportadorHttpSefinNacional>().mockResolvedValue({
      status: 400,
      body: JSON.stringify({
        Erros: [
          {
            Codigo: 'E999',
            Descricao: 'DPS invalida.',
            Complemento: 'Campo cTribNac nao foi informado.',
          },
        ],
      }),
    });
    const cliente = criarClienteTeste(transportador, {
      certificadoPath: certificado.caminho,
      certificadoSenha: 'senha-teste',
    });

    try {
      const resultado = await cliente.enviarDpsAssinada({
        ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
        xmlAssinado,
      });

      expect(resultado).toEqual({
        sucesso: false,
        statusHttp: 400,
        erros: [
          {
            codigo: 'E999',
            mensagem: 'DPS invalida. Campo cTribNac nao foi informado.',
            campo: undefined,
          },
        ],
      });
    } finally {
      certificado.limpar();
    }
  });

  it('deve retornar erros estruturados quando a consulta de NFS-e falhar', async () => {
    const certificado = criarCertificadoTeste();
    const transportador = vi.fn<TransportadorHttpSefinNacional>().mockResolvedValue({
      status: 404,
      body: JSON.stringify({
        erro: {
          codigo: 'E404',
          descricao: 'Chave de acesso nao encontrada.',
        },
      }),
    });
    const cliente = criarClienteTeste(transportador, {
      certificadoPath: certificado.caminho,
      certificadoSenha: 'senha-teste',
    });

    try {
      const resultado = await cliente.consultarNfsePorChave({
        ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
        chaveAcesso: '12345678901234567890123456789012345678901234567890',
      });

      expect(resultado).toEqual({
        sucesso: false,
        statusHttp: 404,
        erros: [
          {
            codigo: 'E404',
            mensagem: 'Chave de acesso nao encontrada.',
            campo: undefined,
          },
        ],
      });
    } finally {
      certificado.limpar();
    }
  });

  it('deve retornar erros estruturados quando o cancelamento for recusado', async () => {
    const certificado = criarCertificadoTeste();
    const transportador = vi.fn<TransportadorHttpSefinNacional>().mockResolvedValue({
      status: 400,
      body: JSON.stringify({
        erros: [
          {
            codigo: 'E101',
            mensagem: 'Evento rejeitado.',
          },
        ],
      }),
    });
    const cliente = criarClienteTeste(transportador, {
      certificadoPath: certificado.caminho,
      certificadoSenha: 'senha-teste',
    });

    try {
      const resultado = await cliente.registrarEventoCancelamento({
        ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
        chaveAcesso: '12345678901234567890123456789012345678901234567890',
        xmlPedidoEventoAssinado: '<pedRegEvento>assinado</pedRegEvento>',
      });

      expect(resultado).toEqual({
        sucesso: false,
        statusHttp: 400,
        erros: [
          {
            codigo: 'E101',
            mensagem: 'Evento rejeitado.',
            campo: undefined,
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
      cliente.enviarDpsAssinada({
        ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
        xmlAssinado,
      }),
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
      cliente.enviarDpsAssinada({
        ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
        xmlAssinado,
      }),
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
        cliente.enviarDpsAssinada({
          ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
          xmlAssinado,
        }),
      ).rejects.toMatchObject({
        message: 'Nao foi possivel comunicar com a SEFIN Nacional.',
      });
      await expect(
        cliente.enviarDpsAssinada({
          ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
          xmlAssinado,
        }),
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
        cliente.enviarDpsAssinada({
          ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
          xmlAssinado,
        }),
      ).rejects.toBeInstanceOf(ComunicacaoNfseError);
      await expect(
        cliente.enviarDpsAssinada({
          ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
          xmlAssinado,
        }),
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
      baseUrlHomologacao:
        'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
      baseUrlProducao: 'https://sefin.nfse.gov.br/SefinNacional',
      endpointEnvioDps: 'nfse',
      ...configuracao,
    }),
    transportador,
  );
}

function criarCertificadoTeste(): {
  caminho: string;
  limpar: () => void;
} {
  const pasta = mkdtempSync(join(tmpdir(), 'nfse-certificado-'));
  const caminho = join(pasta, 'certificado.pfx');
  const senha = 'senha-teste';
  const chaves = forge.pki.rsa.generateKeyPair(1024);
  const certificado = forge.pki.createCertificate();

  certificado.publicKey = chaves.publicKey;
  certificado.serialNumber = '01';
  certificado.validity.notBefore = new Date(Date.now() - 60_000);
  certificado.validity.notAfter = new Date(Date.now() + 86_400_000);
  certificado.setSubject([
    { name: 'commonName', value: 'Empresa Teste Ltda:12345678000199' },
  ]);
  certificado.setIssuer(certificado.subject.attributes);
  certificado.sign(chaves.privateKey, forge.md.sha256.create());

  const pfx = forge.pkcs12.toPkcs12Asn1(
    chaves.privateKey,
    certificado,
    senha,
    { algorithm: '3des' },
  );
  const bytes = forge.asn1.toDer(pfx).getBytes();

  writeFileSync(caminho, Buffer.from(bytes, 'binary'));

  return {
    caminho,
    limpar: () => rmSync(pasta, { recursive: true, force: true }),
  };
}
