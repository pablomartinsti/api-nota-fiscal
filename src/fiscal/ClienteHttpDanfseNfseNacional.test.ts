import { describe, expect, it, vi } from 'vitest';

import { AmbienteFiscal } from '../entities/NotaServico';
import { ClienteHttpDanfseNfseNacional } from './ClienteHttpDanfseNfseNacional';

const chaveAcesso = '12345678901234567890123456789012345678901234567890';
const pdf = Buffer.from('%PDF-1.4\nconteudo');

describe('ClienteHttpDanfseNfseNacional', () => {
  it('deve baixar o PDF oficial pela chave de acesso em producao', async () => {
    const transportador = vi.fn().mockResolvedValue({
      status: 200,
      headers: {
        'content-type': 'application/pdf',
      },
      body: pdf,
    });
    const cliente = new ClienteHttpDanfseNfseNacional(
      () => ({
        baseUrlProducao: 'https://adn.nfse.gov.br/danfse',
      }),
      transportador,
    );

    const resultado = await cliente.baixarDanfsePorChave({
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
      chaveAcesso,
    });

    expect(transportador).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `https://adn.nfse.gov.br/danfse/${chaveAcesso}`,
        method: 'GET',
        headers: {
          Accept: 'application/pdf',
        },
      }),
    );
    expect(resultado).toEqual({
      sucesso: true,
      statusHttp: 200,
      chaveAcesso,
      pdf,
      contentType: 'application/pdf',
    });
  });

  it('deve tentar novamente quando o Portal Nacional retornar indisponibilidade temporaria', async () => {
    const transportador = vi
      .fn()
      .mockResolvedValueOnce({
        status: 503,
        headers: {
          'content-type': 'text/html',
        },
        body: Buffer.from(
          '<html><body><h1>503 Service Unavailable</h1>No server is available to handle this request.</body></html>',
        ),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {
          'content-type': 'application/pdf',
        },
        body: pdf,
      });
    const cliente = new ClienteHttpDanfseNfseNacional(
      () => ({
        baseUrlProducao: 'https://adn.nfse.gov.br/danfse',
      }),
      transportador,
    );

    const resultado = await cliente.baixarDanfsePorChave({
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
      chaveAcesso,
    });

    expect(transportador).toHaveBeenCalledTimes(2);
    expect(resultado).toEqual({
      sucesso: true,
      statusHttp: 200,
      chaveAcesso,
      pdf,
      contentType: 'application/pdf',
    });
  });

  it('deve retornar erro quando a API DANFSe rejeitar a chave', async () => {
    const transportador = vi.fn().mockResolvedValue({
      status: 404,
      headers: {
        'content-type': 'application/json',
      },
      body: Buffer.from(
        JSON.stringify({
          codigo: 'E404',
          mensagem: 'DANFSe nao encontrada.',
        }),
      ),
    });
    const cliente = new ClienteHttpDanfseNfseNacional(
      () => ({
        baseUrlHomologacao:
          'https://adn.producaorestrita.nfse.gov.br/danfse',
      }),
      transportador,
    );

    const resultado = await cliente.baixarDanfsePorChave({
      ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
      chaveAcesso,
    });

    expect(resultado).toEqual({
      sucesso: false,
      statusHttp: 404,
      chaveAcesso,
      erros: [
        {
          codigo: 'E404',
          campo: undefined,
          mensagem: 'DANFSe nao encontrada.',
        },
      ],
    });
  });

  it('deve simplificar erro HTML de indisponibilidade do DANFSe', async () => {
    const transportador = vi.fn().mockResolvedValue({
      status: 503,
      headers: {
        'content-type': 'text/html',
      },
      body: Buffer.from(
        '<html><body><h1>503 Service Unavailable</h1>No server is available to handle this request.</body></html>',
      ),
    });
    const cliente = new ClienteHttpDanfseNfseNacional(
      () => ({
        baseUrlProducao: 'https://adn.nfse.gov.br/danfse',
      }),
      transportador,
    );

    const resultado = await cliente.baixarDanfsePorChave({
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
      chaveAcesso,
    });

    expect(resultado).toEqual({
      sucesso: false,
      statusHttp: 503,
      chaveAcesso,
      erros: [
        {
          mensagem:
            'Servico DANFSe indisponivel no Portal Nacional. Tente novamente mais tarde.',
        },
      ],
    });
  });
});
