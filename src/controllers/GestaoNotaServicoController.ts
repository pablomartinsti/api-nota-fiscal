import { Request, Response } from 'express';

import {
  atualizarRascunhoNotaServicoSchema,
  cadastrarRascunhoNotaServicoSchema,
  notaServicoParamsSchema,
} from '../dtos/GestaoNotaServicoDto';
import { NotaServicoPresenter } from '../presenters/NotaServicoPresenter';
import { AtualizarRascunhoNotaServicoService } from '../services/AtualizarRascunhoNotaServicoService';
import { BuscarNotaServicoService } from '../services/BuscarNotaServicoService';
import { CadastrarRascunhoNotaServicoService } from '../services/CadastrarRascunhoNotaServicoService';
import { ListarNotasServicoService } from '../services/ListarNotasServicoService';

export class GestaoNotaServicoController {
  constructor(
    private readonly cadastrarService: CadastrarRascunhoNotaServicoService,
    private readonly listarService: ListarNotasServicoService,
    private readonly buscarService: BuscarNotaServicoService,
    private readonly atualizarService: AtualizarRascunhoNotaServicoService,
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
}
