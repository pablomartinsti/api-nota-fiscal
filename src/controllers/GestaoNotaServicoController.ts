import { Request, Response } from 'express';

import {
  atualizarRascunhoNotaServicoSchema,
  cadastrarRascunhoNotaServicoSchema,
  emitirNotaServicoSchema,
  notaServicoParamsSchema,
} from '../dtos/GestaoNotaServicoDto';
import { NotaServicoPresenter } from '../presenters/NotaServicoPresenter';
import { AtualizarRascunhoNotaServicoService } from '../services/AtualizarRascunhoNotaServicoService';
import { BuscarNotaServicoService } from '../services/BuscarNotaServicoService';
import { CancelarNotaServicoService } from '../services/CancelarNotaServicoService';
import { CadastrarRascunhoNotaServicoService } from '../services/CadastrarRascunhoNotaServicoService';
import { EmitirNotaServicoService } from '../services/EmitirNotaServicoService';
import { GerarXmlDpsNotaServicoService } from '../services/GerarXmlDpsNotaServicoService';
import { ListarNotasServicoService } from '../services/ListarNotasServicoService';
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
}
