import { Request, Response } from 'express';

import {
  atualizarRascunhoNotaServicoSchema,
  cancelarNfseNotaServicoSchema,
  cadastrarRascunhoNotaServicoSchema,
  emitirNotaServicoSchema,
  notaServicoParamsSchema,
  reconciliarEnvioDpsNotaServicoSchema,
  substituirNfseNotaServicoSchema,
} from '../dtos/GestaoNotaServicoDto';
import { NotaServicoEventoFiscalPresenter } from '../presenters/NotaServicoEventoFiscalPresenter';
import { NotaServicoPresenter } from '../presenters/NotaServicoPresenter';
import { AtualizarRascunhoNotaServicoService } from '../services/AtualizarRascunhoNotaServicoService';
import { BaixarDanfseNotaServicoService } from '../services/BaixarDanfseNotaServicoService';
import { BuscarNotaServicoService } from '../services/BuscarNotaServicoService';
import { CancelarNotaServicoService } from '../services/CancelarNotaServicoService';
import { CancelarNfseNotaServicoService } from '../services/CancelarNfseNotaServicoService';
import { CadastrarRascunhoNotaServicoService } from '../services/CadastrarRascunhoNotaServicoService';
import { ConsultarNfseEmitidaNotaServicoService } from '../services/ConsultarNfseEmitidaNotaServicoService';
import { CriarRascunhoSubstituicaoNotaServicoService } from '../services/CriarRascunhoSubstituicaoNotaServicoService';
import { EmitirNotaServicoService } from '../services/EmitirNotaServicoService';
import { EnviarDpsAssinadaNotaServicoService } from '../services/EnviarDpsAssinadaNotaServicoService';
import { GerarXmlDpsNotaServicoService } from '../services/GerarXmlDpsNotaServicoService';
import { GerarXmlDpsAssinadoNotaServicoService } from '../services/GerarXmlDpsAssinadoNotaServicoService';
import { ListarEventosFiscaisNotaServicoService } from '../services/ListarEventosFiscaisNotaServicoService';
import { ListarNotasServicoService } from '../services/ListarNotasServicoService';
import { ReconciliarEnvioDpsNotaServicoService } from '../services/ReconciliarEnvioDpsNotaServicoService';
import { RetornarNotaServicoParaRascunhoService } from '../services/RetornarNotaServicoParaRascunhoService';
import { ValidarProntidaoFiscalNotaServicoService } from '../services/ValidarProntidaoFiscalNotaServicoService';

export class GestaoNotaServicoController {
  constructor(
    private readonly cadastrarService: CadastrarRascunhoNotaServicoService,
    private readonly listarService: ListarNotasServicoService,
    private readonly buscarService: BuscarNotaServicoService,
    private readonly atualizarService: AtualizarRascunhoNotaServicoService,
    private readonly emitirService: EmitirNotaServicoService,
    private readonly retornarParaRascunhoService: RetornarNotaServicoParaRascunhoService,
    private readonly cancelarService: CancelarNotaServicoService,
    private readonly validarProntidaoFiscalService: ValidarProntidaoFiscalNotaServicoService,
    private readonly gerarXmlDpsService: GerarXmlDpsNotaServicoService,
    private readonly gerarXmlDpsAssinadoService: GerarXmlDpsAssinadoNotaServicoService,
    private readonly enviarDpsAssinadaService: EnviarDpsAssinadaNotaServicoService,
    private readonly consultarNfseEmitidaService: ConsultarNfseEmitidaNotaServicoService,
    private readonly cancelarNfseService: CancelarNfseNotaServicoService,
    private readonly criarRascunhoSubstituicaoService: CriarRascunhoSubstituicaoNotaServicoService,
    private readonly reconciliarEnvioDpsService: ReconciliarEnvioDpsNotaServicoService,
    private readonly listarEventosFiscaisService: ListarEventosFiscaisNotaServicoService,
    private readonly baixarDanfseService: BaixarDanfseNotaServicoService,
  ) {}

  async cadastrar(request: Request, response: Response): Promise<Response> {
    const input = cadastrarRascunhoNotaServicoSchema.parse(request.body);
    const nota = await this.cadastrarService.executar(
      request.autenticacao,
      input,
    );

    return response.status(201).json(NotaServicoPresenter.paraHttp(nota));
  }

  async listar(request: Request, response: Response): Promise<Response> {
    const notas = await this.listarService.executar(request.autenticacao);

    return response.status(200).json(notas.map(NotaServicoPresenter.paraHttp));
  }

  async buscar(request: Request, response: Response): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const nota = await this.buscarService.executar(
      request.autenticacao,
      notaId,
    );

    return response.status(200).json(NotaServicoPresenter.paraHttp(nota));
  }

  async atualizar(request: Request, response: Response): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const input = atualizarRascunhoNotaServicoSchema.parse(request.body);
    const nota = await this.atualizarService.executar(
      request.autenticacao,
      notaId,
      input,
    );

    return response.status(200).json(NotaServicoPresenter.paraHttp(nota));
  }

  async emitir(request: Request, response: Response): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const { simularFalha } = emitirNotaServicoSchema.parse(request.body ?? {});
    const nota = await this.emitirService.executar(
      request.autenticacao,
      notaId,
      simularFalha,
    );

    return response.status(200).json(NotaServicoPresenter.paraHttp(nota));
  }

  async retornarParaRascunho(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const nota = await this.retornarParaRascunhoService.executar(
      request.autenticacao,
      notaId,
    );

    return response.status(200).json(NotaServicoPresenter.paraHttp(nota));
  }

  async cancelar(request: Request, response: Response): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const nota = await this.cancelarService.executar(
      request.autenticacao,
      notaId,
    );

    return response.status(200).json(NotaServicoPresenter.paraHttp(nota));
  }

  async validarProntidaoFiscal(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const resultado = await this.validarProntidaoFiscalService.executar(
      request.autenticacao,
      notaId,
    );

    return response.status(200).json(resultado);
  }

  async gerarXmlDps(request: Request, response: Response): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const xml = await this.gerarXmlDpsService.executar(
      request.autenticacao,
      notaId,
    );

    return response.status(200).type('application/xml').send(xml);
  }

  async gerarXmlDpsAssinado(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const xml = await this.gerarXmlDpsAssinadoService.executar(
      request.autenticacao,
      notaId,
    );

    return response.status(200).type('application/xml').send(xml);
  }

  async enviarDpsAssinada(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const nota = await this.enviarDpsAssinadaService.executar(
      request.autenticacao,
      notaId,
    );

    return response.status(200).json(NotaServicoPresenter.paraHttp(nota));
  }

  async consultarNfseEmitida(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const resultado = await this.consultarNfseEmitidaService.executar(
      request.autenticacao,
      notaId,
    );

    return response.status(200).json(resultado);
  }

  async cancelarNfse(request: Request, response: Response): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const input = cancelarNfseNotaServicoSchema.parse(request.body);
    const resultado = await this.cancelarNfseService.executar(
      request.autenticacao,
      notaId,
      input,
    );

    return response.status(200).json({
      nota: NotaServicoPresenter.paraHttp(resultado.nota),
      sucesso: resultado.sucesso,
      statusHttp: resultado.statusHttp,
      tipoAmbiente: resultado.tipoAmbiente,
      versaoAplicativo: resultado.versaoAplicativo,
      dataHoraProcessamento: resultado.dataHoraProcessamento,
      xmlEvento: resultado.xmlEvento,
      erros: resultado.erros,
    });
  }

  async substituirNfse(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const input = substituirNfseNotaServicoSchema.parse(request.body);
    const nota = await this.criarRascunhoSubstituicaoService.executar(
      request.autenticacao,
      notaId,
      input,
    );

    return response.status(201).json(NotaServicoPresenter.paraHttp(nota));
  }

  async reconciliarEnvioDps(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const input = reconciliarEnvioDpsNotaServicoSchema.parse(
      request.body ?? {},
    );
    const resultado = await this.reconciliarEnvioDpsService.executar(
      request.autenticacao,
      notaId,
      input,
    );

    return response.status(200).json({
      nota: NotaServicoPresenter.paraHttp(resultado.nota),
      reconciliada: resultado.reconciliada,
      sucesso: resultado.sucesso,
      statusHttp: resultado.statusHttp,
      chaveAcesso: resultado.chaveAcesso,
      tipoAmbiente: resultado.tipoAmbiente,
      versaoAplicativo: resultado.versaoAplicativo,
      dataHoraProcessamento: resultado.dataHoraProcessamento,
      xmlAutorizado: resultado.xmlAutorizado,
      erros: resultado.erros,
    });
  }

  async listarEventosFiscais(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const eventos = await this.listarEventosFiscaisService.executar(
      request.autenticacao,
      notaId,
    );

    return response
      .status(200)
      .json(eventos.map(NotaServicoEventoFiscalPresenter.paraHttp));
  }

  async baixarDanfse(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const { notaId } = notaServicoParamsSchema.parse(request.params);
    const resultado = await this.baixarDanfseService.executar(
      request.autenticacao,
      notaId,
    );

    if (!resultado.sucesso || !resultado.pdf) {
      return response.status(resultado.statusHttp).json({
        sucesso: resultado.sucesso,
        statusHttp: resultado.statusHttp,
        chaveAcesso: resultado.chaveAcesso,
        erros: resultado.erros,
      });
    }

    return response
      .status(200)
      .type(resultado.contentType ?? 'application/pdf')
      .setHeader(
        'Content-Disposition',
        `inline; filename="danfse-${resultado.chaveAcesso}.pdf"`,
      )
      .send(resultado.pdf);
  }
}
