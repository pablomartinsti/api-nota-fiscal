import { Request, Response } from 'express';

import {
  atualizarConfiguracaoFiscalEmpresaSchema,
  atualizarEmpresaSchema,
} from '../dtos/GestaoEmpresaDto';
import { ConfiguracaoFiscalEmpresaPresenter } from '../presenters/ConfiguracaoFiscalEmpresaPresenter';
import { EmpresaPresenter } from '../presenters/EmpresaPresenter';
import { AtualizarConfiguracaoFiscalEmpresaAutenticadaService } from '../services/AtualizarConfiguracaoFiscalEmpresaAutenticadaService';
import { AtualizarEmpresaAutenticadaService } from '../services/AtualizarEmpresaAutenticadaService';
import { BuscarConfiguracaoFiscalEmpresaAutenticadaService } from '../services/BuscarConfiguracaoFiscalEmpresaAutenticadaService';
import { BuscarEmpresaAutenticadaService } from '../services/BuscarEmpresaAutenticadaService';

export class GestaoEmpresaController {
  constructor(
    private readonly buscarService: BuscarEmpresaAutenticadaService,
    private readonly atualizarService: AtualizarEmpresaAutenticadaService,
    private readonly buscarConfiguracaoFiscalService: BuscarConfiguracaoFiscalEmpresaAutenticadaService,
    private readonly atualizarConfiguracaoFiscalService: AtualizarConfiguracaoFiscalEmpresaAutenticadaService,
  ) {}

  async buscar(request: Request, response: Response): Promise<Response> {
    const empresa = await this.buscarService.executar(request.autenticacao);

    return response.status(200).json(EmpresaPresenter.paraHttp(empresa));
  }

  async buscarConfiguracaoFiscal(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const resultado = await this.buscarConfiguracaoFiscalService.executar(
      request.autenticacao,
    );

    return response
      .status(200)
      .json(
        ConfiguracaoFiscalEmpresaPresenter.paraHttp(
          resultado.configuracao,
          resultado.configurada,
        ),
      );
  }

  async atualizar(request: Request, response: Response): Promise<Response> {
    const input = atualizarEmpresaSchema.parse(request.body);
    const empresa = await this.atualizarService.executar(
      request.autenticacao,
      input,
    );

    return response.status(200).json(EmpresaPresenter.paraHttp(empresa));
  }

  async atualizarConfiguracaoFiscal(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const input = atualizarConfiguracaoFiscalEmpresaSchema.parse(request.body);
    const configuracao =
      await this.atualizarConfiguracaoFiscalService.executar(
        request.autenticacao,
        input,
      );

    return response
      .status(200)
      .json(ConfiguracaoFiscalEmpresaPresenter.paraHttp(configuracao));
  }
}
