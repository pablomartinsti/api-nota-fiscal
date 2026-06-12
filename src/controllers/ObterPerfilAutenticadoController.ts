import { Request, Response } from 'express';

import { EmpresaPresenter } from '../presenters/EmpresaPresenter';
import { ObterPerfilAutenticadoService } from '../services/ObterPerfilAutenticadoService';

export class ObterPerfilAutenticadoController {
  constructor(
    private readonly obterPerfilAutenticadoService: ObterPerfilAutenticadoService,
  ) {}

  async handle(request: Request, response: Response): Promise<Response> {
    const { usuario, empresa } =
      await this.obterPerfilAutenticadoService.executar(request.autenticacao);

    return response.status(200).json({
      usuario: {
        id: usuario.id,
        empresaId: usuario.empresaId,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ativo: usuario.ativo,
      },
      empresa: EmpresaPresenter.paraResumoHttp(empresa),
    });
  }
}
