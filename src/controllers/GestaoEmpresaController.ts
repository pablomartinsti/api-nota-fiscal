import { Request, Response } from 'express';

import { atualizarEmpresaSchema } from '../dtos/GestaoEmpresaDto';
import { EmpresaPresenter } from '../presenters/EmpresaPresenter';
import { AtualizarEmpresaAutenticadaService } from '../services/AtualizarEmpresaAutenticadaService';
import { BuscarEmpresaAutenticadaService } from '../services/BuscarEmpresaAutenticadaService';

export class GestaoEmpresaController {
  constructor(
    private readonly buscarService: BuscarEmpresaAutenticadaService,
    private readonly atualizarService: AtualizarEmpresaAutenticadaService,
  ) {}

  async buscar(request: Request, response: Response): Promise<Response> {
    const empresa = await this.buscarService.executar(request.autenticacao);

    return response.status(200).json(EmpresaPresenter.paraHttp(empresa));
  }

  async atualizar(request: Request, response: Response): Promise<Response> {
    const input = atualizarEmpresaSchema.parse(request.body);
    const empresa = await this.atualizarService.executar(
      request.autenticacao,
      input,
    );

    return response.status(200).json(EmpresaPresenter.paraHttp(empresa));
  }
}
