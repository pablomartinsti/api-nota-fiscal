import { Request, Response } from 'express';

import {
  alterarStatusServicoSchema,
  atualizarServicoSchema,
  cadastrarServicoSchema,
  servicoParamsSchema,
} from '../dtos/GestaoServicoDto';
import { ServicoPresenter } from '../presenters/ServicoPresenter';
import { AlterarStatusServicoService } from '../services/AlterarStatusServicoService';
import { AtualizarServicoService } from '../services/AtualizarServicoService';
import { BuscarServicoService } from '../services/BuscarServicoService';
import { CadastrarServicoService } from '../services/CadastrarServicoService';
import { ListarServicosService } from '../services/ListarServicosService';

export class GestaoServicoController {
  constructor(
    private readonly cadastrarService: CadastrarServicoService,
    private readonly listarService: ListarServicosService,
    private readonly buscarService: BuscarServicoService,
    private readonly atualizarService: AtualizarServicoService,
    private readonly alterarStatusService: AlterarStatusServicoService,
  ) {}

  async cadastrar(request: Request, response: Response): Promise<Response> {
    const input = cadastrarServicoSchema.parse(request.body);
    const servico = await this.cadastrarService.executar(
      request.autenticacao,
      input,
    );

    return response.status(201).json(ServicoPresenter.paraHttp(servico));
  }

  async listar(request: Request, response: Response): Promise<Response> {
    const servicos = await this.listarService.executar(request.autenticacao);

    return response.status(200).json(servicos.map(ServicoPresenter.paraHttp));
  }

  async buscar(request: Request, response: Response): Promise<Response> {
    const { servicoId } = servicoParamsSchema.parse(request.params);
    const servico = await this.buscarService.executar(
      request.autenticacao,
      servicoId,
    );

    return response.status(200).json(ServicoPresenter.paraHttp(servico));
  }

  async atualizar(request: Request, response: Response): Promise<Response> {
    const { servicoId } = servicoParamsSchema.parse(request.params);
    const input = atualizarServicoSchema.parse(request.body);
    const servico = await this.atualizarService.executar(
      request.autenticacao,
      servicoId,
      input,
    );

    return response.status(200).json(ServicoPresenter.paraHttp(servico));
  }

  async alterarStatus(request: Request, response: Response): Promise<Response> {
    const { servicoId } = servicoParamsSchema.parse(request.params);
    const { ativo } = alterarStatusServicoSchema.parse(request.body);
    const servico = await this.alterarStatusService.executar(
      request.autenticacao,
      servicoId,
      ativo,
    );

    return response.status(200).json(ServicoPresenter.paraHttp(servico));
  }
}
