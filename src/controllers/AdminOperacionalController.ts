import { Request, Response } from 'express';

import {
  atualizarConfiguracaoFiscalEmpresaAdminBodySchema,
  atualizarConfiguracaoFiscalEmpresaAdminParamsSchema,
  atualizarEmissaoEmpresaAdminBodySchema,
  atualizarEmissaoEmpresaAdminParamsSchema,
  listarEventosFiscaisAdminQuerySchema,
  listarNotasAdminQuerySchema,
} from '../dtos/AdminOperacionalDto';
import { AtualizarConfiguracaoFiscalEmpresaAdminOperacionalService } from '../services/admin-operacional/AtualizarConfiguracaoFiscalEmpresaAdminOperacionalService';
import { AtualizarEmissaoEmpresaAdminOperacionalService } from '../services/admin-operacional/AtualizarEmissaoEmpresaAdminOperacionalService';
import { ListarEventosFiscaisAdminOperacionalService } from '../services/admin-operacional/ListarEventosFiscaisAdminOperacionalService';
import { ListarEmpresasAdminOperacionalService } from '../services/admin-operacional/ListarEmpresasAdminOperacionalService';
import { ListarNotasAdminOperacionalService } from '../services/admin-operacional/ListarNotasAdminOperacionalService';

export class AdminOperacionalController {
  constructor(
    private readonly listarEmpresasService: ListarEmpresasAdminOperacionalService,
    private readonly atualizarEmissaoEmpresaService: AtualizarEmissaoEmpresaAdminOperacionalService,
    private readonly atualizarConfiguracaoFiscalEmpresaService: AtualizarConfiguracaoFiscalEmpresaAdminOperacionalService,
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

  async atualizarConfiguracaoFiscalEmpresa(
    request: Request,
    response: Response,
  ): Promise<Response> {
    const { empresaId } =
      atualizarConfiguracaoFiscalEmpresaAdminParamsSchema.parse(request.params);
    const dados = atualizarConfiguracaoFiscalEmpresaAdminBodySchema.parse(
      request.body,
    );

    const empresa =
      await this.atualizarConfiguracaoFiscalEmpresaService.executar(
        empresaId,
        dados,
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
