import { Request, Response } from 'express';

import {
  cadastrarUsuarioProprietarioParamsSchema,
  cadastrarUsuarioProprietarioSchema,
} from '../dtos/CadastrarUsuarioProprietarioDto';
import { CadastrarUsuarioProprietarioService } from '../services/CadastrarUsuarioProprietarioService';

export class CadastrarUsuarioProprietarioController {
  constructor(
    private readonly cadastrarUsuarioProprietarioService: CadastrarUsuarioProprietarioService,
  ) {}

  async handle(request: Request, response: Response): Promise<Response> {
    const { empresaId } = cadastrarUsuarioProprietarioParamsSchema.parse(
      request.params,
    );
    const input = cadastrarUsuarioProprietarioSchema.parse(request.body);
    const usuario = await this.cadastrarUsuarioProprietarioService.executar({
      empresaId,
      ...input,
    });

    return response.status(201).json({
      id: usuario.id,
      empresaId: usuario.empresaId,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ativo: usuario.ativo,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
    });
  }
}
