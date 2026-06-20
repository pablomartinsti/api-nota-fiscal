import { describe, expect, it, vi } from 'vitest';

import { Cliente } from '../entities/Cliente';
import { AmbienteFiscal } from '../entities/NotaServico';
import { ClienteNaoEncontradoError } from '../errors/ClienteNaoEncontradoError';
import { ClienteDistribuicaoNfseNacional } from '../fiscal/ClienteDistribuicaoNfseNacional';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { PerfilUsuario } from '../entities/Usuario';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';
import { ListarXmlsNfseClientePeriodoService } from './ListarXmlsNfseClientePeriodoService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

describe('ListarXmlsNfseClientePeriodoService', () => {
  it('deve consultar a ADN por NSU e retornar apenas XMLs do cliente no mes informado', async () => {
    const cliente = criarCliente();
    const clienteRepository = criarClienteRepository(cliente);
    const clienteDistribuicao = criarClienteDistribuicao();
    const service = criarService(clienteRepository, clienteDistribuicao);

    const resultado = await service.executar(autenticacao, {
      clienteId: 'cliente-1',
      ano: 2026,
      mes: 6,
      nsuInicial: 0,
      limiteConsultas: 2,
    });

    expect(resultado.sucesso).toBe(true);
    expect(resultado.total).toBe(1);
    expect(resultado.notas[0]).toMatchObject({
      nsu: 1,
      numeroNfse: '10',
      statusFiscal: 'AUTORIZADA',
      codigoStatus: '100',
      valorServico: 100,
    });
    expect(clienteDistribuicao.consultarDocumentosPorNsu).toHaveBeenCalledTimes(
      2,
    );
    expect(clienteDistribuicao.consultarDocumentosPorNsu).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
        nsu: 0,
      }),
    );
    expect(clienteDistribuicao.consultarDocumentosPorNsu).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
        nsu: 1,
      }),
    );
  });

  it('deve impedir consulta de XMLs para cliente inexistente na empresa', async () => {
    const clienteRepository = criarClienteRepository(null);
    const clienteDistribuicao = criarClienteDistribuicao();
    const service = criarService(clienteRepository, clienteDistribuicao);

    await expect(
      service.executar(autenticacao, {
        clienteId: 'cliente-inexistente',
        ano: 2026,
        mes: 6,
      }),
    ).rejects.toBeInstanceOf(ClienteNaoEncontradoError);
    expect(clienteDistribuicao.consultarDocumentosPorNsu).not.toHaveBeenCalled();
  });
});

function criarService(
  clienteRepository: ClienteRepository,
  clienteDistribuicao: ClienteDistribuicaoNfseNacional,
) {
  return new ListarXmlsNfseClientePeriodoService(
    clienteRepository,
    clienteDistribuicao,
    new ResolverConfiguracaoFiscalEmpresaService(
      criarConfiguracaoFiscalRepository(),
    ),
    new ValidarPermissaoProducaoRealService(false),
  );
}

function criarClienteRepository(cliente: Cliente | null): ClienteRepository {
  return {
    salvar: vi.fn(),
    buscarPorIdEEmpresaId: vi.fn().mockResolvedValue(cliente),
    buscarPorCpfCnpjEEmpresaId: vi.fn(),
    listarPorEmpresaId: vi.fn(),
  };
}

function criarConfiguracaoFiscalRepository(): ConfiguracaoFiscalEmpresaRepository {
  return {
    salvar: vi.fn(),
    buscarPorEmpresaId: vi.fn().mockResolvedValue(null),
  };
}

function criarClienteDistribuicao(): ClienteDistribuicaoNfseNacional {
  return {
    consultarDocumentosPorNsu: vi
      .fn()
      .mockResolvedValueOnce({
        sucesso: true,
        statusHttp: 200,
        documentos: [],
        proximoNsu: 1,
        maxNsu: 1,
      })
      .mockResolvedValueOnce({
        sucesso: true,
        statusHttp: 200,
        documentos: [
          {
            nsu: 1,
            chaveAcesso:
              '31702062258504778000118000000000001026061900000000',
            xml: criarXmlNfse({
              cpfCnpjTomador: '53477940000132',
              dataEmissao: '2026-06-19T10:00:00-03:00',
              valorServico: '100.00',
            }),
          },
          {
            nsu: 2,
            chaveAcesso:
              '31702062258504778000118000000000001126051900000000',
            xml: criarXmlNfse({
              cpfCnpjTomador: '53477940000132',
              dataEmissao: '2026-05-19T10:00:00-03:00',
              valorServico: '200.00',
            }),
          },
          {
            nsu: 3,
            chaveAcesso:
              '31702062258504778000118000000000001226061900000000',
            xml: criarXmlNfse({
              cpfCnpjTomador: '11111111000191',
              dataEmissao: '2026-06-19T10:00:00-03:00',
              valorServico: '300.00',
            }),
          },
        ],
        maxNsu: 1,
      }),
  };
}

function criarCliente(): Cliente {
  return new Cliente({
    id: 'cliente-1',
    empresaId: 'empresa-1',
    nomeRazaoSocial: '53.477.940 PABLO FERREIRA MARTINS',
    cpfCnpj: '53477940000132',
    cidade: 'Uberlandia',
    uf: 'MG',
  });
}

function criarXmlNfse(input: {
  cpfCnpjTomador: string;
  dataEmissao: string;
  valorServico: string;
}): string {
  return [
    '<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">',
    '<infNFSe Id="NFS31702062258504778000118000000000001026061900000000">',
    '<nNFSe>10</nNFSe>',
    '<cStat>100</cStat>',
    `<dhProc>${input.dataEmissao}</dhProc>`,
    '<toma>',
    `<CNPJ>${input.cpfCnpjTomador}</CNPJ>`,
    '</toma>',
    '<valores>',
    `<vLiq>${input.valorServico}</vLiq>`,
    '</valores>',
    '<DPS>',
    '<infDPS>',
    '<dCompet>2026-06-19</dCompet>',
    '</infDPS>',
    '</DPS>',
    '</infNFSe>',
    '</NFSe>',
  ].join('');
}
