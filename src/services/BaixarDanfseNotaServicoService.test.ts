import { describe, expect, it, vi } from 'vitest';

import {
  AmbienteFiscal,
  NotaServico,
  StatusNota,
} from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { TipoEventoFiscalNotaServico } from '../entities/NotaServicoEventoFiscal';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { GeradorPdfDanfseNacional } from '../fiscal/GeradorPdfDanfseNacional';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { BaixarDanfseNotaServicoService } from './BaixarDanfseNotaServicoService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};
const chaveAcesso = '12345678901234567890123456789012345678901234567890';
const pdf = Buffer.from('%PDF-1.4\nconteudo');

const mensagemXmlAusente =
  'DANFSe indisponivel para esta nota porque o XML autorizado nao esta salvo no banco.';

describe('BaixarDanfseNotaServicoService', () => {
  it('deve gerar DANFSe local quando a nota possuir XML autorizado', async () => {
    const nota = criarNota({
      chaveAcesso,
      xmlAutorizado:
        '<NFSe><infNFSe Id="NFS12345678901234567890123456789012345678901234567890"><nNFSe>100</nNFSe></infNFSe></NFSe>',
    });
    const geradorPdfDanfse = criarGeradorPdfDanfse({ chaveAcesso, pdf });
    const { service, registrarEventoFiscal } = criarService(
      nota,
      geradorPdfDanfse,
    );

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(geradorPdfDanfse.gerar).toHaveBeenCalledWith(nota);
    expect(resultado).toEqual({
      sucesso: true,
      statusHttp: 200,
      chaveAcesso,
      pdf,
      contentType: 'application/pdf',
    });
    expect(registrarEventoFiscal.sucesso).toHaveBeenCalledWith({
      empresaId: autenticacao.empresaId,
      notaServicoId: 'nota-1',
      usuarioId: autenticacao.usuarioId,
      tipo: TipoEventoFiscalNotaServico.DOWNLOAD_DANFSE,
      statusHttp: 200,
      chaveAcesso,
      mensagem: 'DANFSe gerado localmente a partir do XML autorizado.',
    });
  });

  it('deve retornar erro controlado quando a nota nao possuir XML autorizado salvo', async () => {
    const nota = criarNota({ chaveAcesso });
    const geradorPdfDanfse = criarGeradorPdfDanfse(undefined);
    const { service, registrarEventoFiscal } = criarService(
      nota,
      geradorPdfDanfse,
    );

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(geradorPdfDanfse.gerar).toHaveBeenCalledWith(nota);
    expect(resultado).toEqual({
      sucesso: false,
      statusHttp: 409,
      chaveAcesso,
      erros: [{ mensagem: mensagemXmlAusente }],
    });
    expect(registrarEventoFiscal.erro).toHaveBeenCalledWith({
      empresaId: autenticacao.empresaId,
      notaServicoId: 'nota-1',
      usuarioId: autenticacao.usuarioId,
      tipo: TipoEventoFiscalNotaServico.DOWNLOAD_DANFSE,
      statusHttp: 409,
      chaveAcesso,
      mensagem: mensagemXmlAusente,
    });
  });

  it('nao deve baixar DANFSe de nota inexistente', async () => {
    const { service, geradorPdfDanfse } = criarService(null);

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(NotaServicoNaoEncontradaError);
    expect(geradorPdfDanfse.gerar).not.toHaveBeenCalled();
  });

  it('nao deve baixar DANFSe de nota sem chave de acesso', async () => {
    const { service, geradorPdfDanfse } = criarService(criarNota());

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
    expect(geradorPdfDanfse.gerar).not.toHaveBeenCalled();
  });
});

function criarService(
  nota: NotaServico | null,
  geradorPdfDanfse = criarGeradorPdfDanfse(undefined),
): {
  service: BaixarDanfseNotaServicoService;
  geradorPdfDanfse: GeradorPdfDanfseNacional;
  registrarEventoFiscal: {
    sucesso: ReturnType<typeof vi.fn>;
    erro: ReturnType<typeof vi.fn>;
  };
} {
  const notaRepository: NotaServicoRepository = {
    salvar: vi.fn(),
    iniciarProcessamentoEnvio: vi.fn(),
    buscarPorIdEEmpresaId: vi.fn().mockResolvedValue(nota),
    listarPorEmpresaId: vi.fn(),
    buscarMaiorNumeroDpsPorEmpresaAmbienteESerie: vi.fn(),
    excluirRascunhoPorIdEEmpresaId: vi.fn(),
  };
  const registrarEventoFiscal = {
    sucesso: vi.fn(),
    erro: vi.fn(),
  };

  return {
    service: new BaixarDanfseNotaServicoService(
      notaRepository,
      new ValidarPermissaoProducaoRealService(false),
      geradorPdfDanfse,
      registrarEventoFiscal as never,
    ),
    geradorPdfDanfse,
    registrarEventoFiscal,
  };
}

function criarGeradorPdfDanfse(
  resultado?: { chaveAcesso: string; pdf: Buffer },
): GeradorPdfDanfseNacional {
  return {
    gerar: vi.fn().mockReturnValue(resultado),
  } as never;
}

function criarNota(props?: {
  chaveAcesso?: string;
  status?: StatusNota;
  xmlAutorizado?: string;
}): NotaServico {
  return new NotaServico({
    id: 'nota-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    valorServico: 100,
    aliquotaIss: 2,
    descricao: 'Servico contabil',
    status: props?.status ?? StatusNota.EMITIDA,
    ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
    numeroNfse: '100',
    dataEmissao: new Date('2026-06-20T10:00:00.000Z'),
    chaveAcesso: props?.chaveAcesso,
    xmlAutorizado: props?.xmlAutorizado,
    codigoVerificacao: props?.chaveAcesso ? undefined : 'ABC123',
  });
}
