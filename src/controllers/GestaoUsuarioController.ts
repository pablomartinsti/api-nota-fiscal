import { Request, Response } from 'express';

import {
  alterarPerfilUsuarioSchema,
  alterarStatusUsuarioSchema,
  cadastrarUsuarioEmpresaSchema,
  usuarioParamsSchema,
} from '../dtos/GestaoUsuarioDto';
import { UsuarioPresenter } from '../presenters/UsuarioPresenter';
import { AlterarPerfilUsuarioService } from '../services/AlterarPerfilUsuarioService';
import { AlterarStatusUsuarioService } from '../services/AlterarStatusUsuarioService';
import { CadastrarUsuarioEmpresaService } from '../services/CadastrarUsuarioEmpresaService';
import { ListarUsuariosEmpresaService } from '../services/ListarUsuariosEmpresaService';

export class GestaoUsuarioController {
  constructor(
    private readonly cadastrarUsuarioService: CadastrarUsuarioEmpresaService,
    private readonly listarUsuariosService: ListarUsuariosEmpresaService,
    private readonly alterarPerfilService: AlterarPerfilUsuarioService,
    private readonly alterarStatusService: AlterarStatusUsuarioService,
  ) {}

  async cadastrar(request: Request, response: Response): Promise<Response> {
    const input = cadastrarUsuarioEmpresaSchema.parse(request.body);
    const usuario = await this.cadastrarUsuarioService.executar({
      autenticacao: request.autenticacao,
      ...input,
    });

    return response.status(201).json(UsuarioPresenter.paraHttp(usuario));
  }

  async listar(request: Request, response: Response): Promise<Response> {
    const usuarios = await this.listarUsuariosService.executar(
      request.autenticacao,
    );

    return response
      .status(200)
      .json(usuarios.map(UsuarioPresenter.paraHttp));
  }

  async alterarPerfil(request: Request, response: Response): Promise<Response> {
    const { usuarioId } = usuarioParamsSchema.parse(request.params);
    const { perfil } = alterarPerfilUsuarioSchema.parse(request.body);
    const usuario = await this.alterarPerfilService.executar(
      request.autenticacao,
      usuarioId,
      perfil,
    );

    return response.status(200).json(UsuarioPresenter.paraHttp(usuario));
  }

  async alterarStatus(request: Request, response: Response): Promise<Response> {
    const { usuarioId } = usuarioParamsSchema.parse(request.params);
    const { ativo } = alterarStatusUsuarioSchema.parse(request.body);
    const usuario = await this.alterarStatusService.executar(
      request.autenticacao,
      usuarioId,
      ativo,
    );

    return response.status(200).json(UsuarioPresenter.paraHttp(usuario));
  }
}
