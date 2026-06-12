import { Request, Response } from 'express';

import {
  alterarStatusClienteSchema,
  atualizarClienteSchema,
  cadastrarClienteSchema,
  clienteParamsSchema,
} from '../dtos/GestaoClienteDto';
import { ClientePresenter } from '../presenters/ClientePresenter';
import { AlterarStatusClienteService } from '../services/AlterarStatusClienteService';
import { AtualizarClienteService } from '../services/AtualizarClienteService';
import { BuscarClienteService } from '../services/BuscarClienteService';
import { CadastrarClienteService } from '../services/CadastrarClienteService';
import { ListarClientesService } from '../services/ListarClientesService';

export class GestaoClienteController {
  constructor(
    private readonly cadastrarService: CadastrarClienteService,
    private readonly listarService: ListarClientesService,
    private readonly buscarService: BuscarClienteService,
    private readonly atualizarService: AtualizarClienteService,
    private readonly alterarStatusService: AlterarStatusClienteService,
  ) {}

  async cadastrar(request: Request, response: Response): Promise<Response> {
    const input = cadastrarClienteSchema.parse(request.body);
    const cliente = await this.cadastrarService.executar(
      request.autenticacao,
      input,
    );

    return response.status(201).json(ClientePresenter.paraHttp(cliente));
  }

  async listar(request: Request, response: Response): Promise<Response> {
    const clientes = await this.listarService.executar(request.autenticacao);

    return response.status(200).json(clientes.map(ClientePresenter.paraHttp));
  }

  async buscar(request: Request, response: Response): Promise<Response> {
    const { clienteId } = clienteParamsSchema.parse(request.params);
    const cliente = await this.buscarService.executar(
      request.autenticacao,
      clienteId,
    );

    return response.status(200).json(ClientePresenter.paraHttp(cliente));
  }

  async atualizar(request: Request, response: Response): Promise<Response> {
    const { clienteId } = clienteParamsSchema.parse(request.params);
    const input = atualizarClienteSchema.parse(request.body);
    const cliente = await this.atualizarService.executar(
      request.autenticacao,
      clienteId,
      input,
    );

    return response.status(200).json(ClientePresenter.paraHttp(cliente));
  }

  async alterarStatus(request: Request, response: Response): Promise<Response> {
    const { clienteId } = clienteParamsSchema.parse(request.params);
    const { ativo } = alterarStatusClienteSchema.parse(request.body);
    const cliente = await this.alterarStatusService.executar(
      request.autenticacao,
      clienteId,
      ativo,
    );

    return response.status(200).json(ClientePresenter.paraHttp(cliente));
  }
}
