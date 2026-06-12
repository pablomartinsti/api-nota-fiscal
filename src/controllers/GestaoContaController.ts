import { Request, Response } from 'express';

import {
  alterarSenhaContaSchema,
  atualizarContaSchema,
} from '../dtos/GestaoContaDto';
import { UsuarioPresenter } from '../presenters/UsuarioPresenter';
import { AlterarSenhaUsuarioAutenticadoService } from '../services/AlterarSenhaUsuarioAutenticadoService';
import { AtualizarContaUsuarioService } from '../services/AtualizarContaUsuarioService';

export class GestaoContaController {
  constructor(
    private readonly atualizarContaService: AtualizarContaUsuarioService,
    private readonly alterarSenhaService: AlterarSenhaUsuarioAutenticadoService,
  ) {}

  async atualizar(request: Request, response: Response): Promise<Response> {
    const input = atualizarContaSchema.parse(request.body);
    const usuario = await this.atualizarContaService.executar(
      request.autenticacao,
      input,
    );

    return response.status(200).json(UsuarioPresenter.paraHttp(usuario));
  }

  async alterarSenha(request: Request, response: Response): Promise<Response> {
    const { senhaAtual, novaSenha } = alterarSenhaContaSchema.parse(
      request.body,
    );
    const usuario = await this.alterarSenhaService.executar(
      request.autenticacao,
      senhaAtual,
      novaSenha,
    );

    return response.status(200).json(UsuarioPresenter.paraHttp(usuario));
  }
}
