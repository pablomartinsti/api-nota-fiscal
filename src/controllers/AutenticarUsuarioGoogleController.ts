import { Request, Response } from 'express';

import { autenticarUsuarioGoogleSchema } from '../dtos/AutenticarUsuarioDto';
import { UsuarioPresenter } from '../presenters/UsuarioPresenter';
import { AutenticarUsuarioGoogleService } from '../services/AutenticarUsuarioGoogleService';

export class AutenticarUsuarioGoogleController {
  constructor(
    private readonly autenticarUsuarioGoogleService: AutenticarUsuarioGoogleService,
  ) {}

  async handle(request: Request, response: Response): Promise<Response> {
    const input = autenticarUsuarioGoogleSchema.parse(request.body);
    const { token, usuario } =
      await this.autenticarUsuarioGoogleService.executar(input);

    return response.status(200).json({
      token,
      usuario: UsuarioPresenter.paraHttp(usuario),
    });
  }
}
