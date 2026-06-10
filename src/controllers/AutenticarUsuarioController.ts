import { Request, Response } from 'express';

import { autenticarUsuarioSchema } from '../dtos/AutenticarUsuarioDto';
import { AutenticarUsuarioService } from '../services/AutenticarUsuarioService';

export class AutenticarUsuarioController {
  constructor(
    private readonly autenticarUsuarioService: AutenticarUsuarioService,
  ) {}

  async handle(request: Request, response: Response): Promise<Response> {
    const input = autenticarUsuarioSchema.parse(request.body);
    const { token, usuario } =
      await this.autenticarUsuarioService.executar(input);

    return response.status(200).json({
      token,
      usuario: {
        id: usuario.id,
        empresaId: usuario.empresaId,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ativo: usuario.ativo,
      },
    });
  }
}
