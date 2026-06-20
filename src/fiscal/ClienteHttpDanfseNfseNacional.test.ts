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
});
