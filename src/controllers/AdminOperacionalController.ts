import { Request, Response } from 'express';

import {
  atualizarEmissaoEmpresaAdminBodySchema,
  atualizarEmissaoEmpresaAdminParamsSchema,
  listarEventosFiscaisAdminQuerySchema,
  listarNotasAdminQuerySchema,
} from '../dtos/AdminOperacionalDto';
import { AtualizarEmissaoEmpresaAdminOperacionalService } from '../services/AtualizarEmissaoEmpresaAdminOperacionalService';
import { ListarEventosFiscaisAdminOperacionalService } from '../services/ListarEventosFiscaisAdminOperacionalService';
import { ListarEmpresasAdminOperacionalService } from '../services/ListarEmpresasAdminOperacionalService';
import { ListarNotasAdminOperacionalService } from '../services/ListarNotasAdminOperacionalService';

export class AdminOperacionalController {
  constructor(
    private readonly listarEmpresasService: ListarEmpresasAdminOperacionalService,
    private readonly atualizarEmissaoEmpresaService: AtualizarEmissaoEmpresaAdminOperacionalService,
    private readonly listarNotasService: ListarNotasAdminOperacionalService,
    private readonly listarEventosFiscaisService: ListarEventosFiscaisAdminOperacionalService,
  ) {}

  async listarEmpresas(request: Request, response: Response): Promise<Response> {
    const empresas = await this.listarEmpresasService.executar();

    return response.status(200).json(empresas);
  }

  async atualizarEmissaoEmpresa(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const { empresaId } = atualizarEmissaoEmpresaAdminParamsSchema.parse(
      request.params,
    );
    const { emissaoHabilitada } =
      atualizarEmissaoEmpresaAdminBodySchema.parse(request.body);

    const empresa = await this.atualizarEmissaoEmpresaService.executar(
      empresaId,
      emissaoHabilitada,
    );

    return response.status(200).json(empresa);
  }

  async listarNotas(request: Request, response: Response): Promise<Response> {
    const filtros = listarNotasAdminQuerySchema.parse(request.query);
    const notas = await this.listarNotasService.executar(filtros);

    return response.status(200).json(notas);
  }

  async listarEventosFiscais(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const filtros = listarEventosFiscaisAdminQuerySchema.parse(request.query);
    const eventos = await this.listarEventosFiscaisService.executar(filtros);

    return response.status(200).json(eventos);
  }
}
