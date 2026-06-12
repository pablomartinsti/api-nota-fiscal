import { NextFunction, Request, Response } from 'express';

import { PerfilUsuario } from '../entities/Usuario';
import { AcessoNegadoError } from '../errors/AcessoNegadoError';

export class AutorizacaoPerfilMiddleware {
  constructor(private readonly perfisPermitidos: PerfilUsuario[]) {}

  handle(
    request: Request,
    _response: Response,
    next: NextFunction,
  ): void {
    if (!this.perfisPermitidos.includes(request.autenticacao.perfil)) {
      next(new AcessoNegadoError());
      return;
    }

    next();
  }
}
