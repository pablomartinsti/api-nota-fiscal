import { NextFunction, Request, Response } from 'express';

import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { GerenciadorToken } from '../security/GerenciadorToken';
import { ValidarContextoAutenticadoService } from '../services/ValidarContextoAutenticadoService';

export class AutenticacaoMiddleware {
  constructor(
    private readonly gerenciadorToken: GerenciadorToken,
    private readonly validarContextoAutenticadoService: ValidarContextoAutenticadoService,
  ) {}

  async handle(
    request: Request,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const authorization = request.headers.authorization;
      const [tipo, token] = authorization?.split(' ') ?? [];

      if (tipo?.toLowerCase() !== 'bearer' || !token) {
        throw new AutenticacaoInvalidaError();
      }

      const payload = await this.gerenciadorToken.verificar(token);
      request.autenticacao =
        await this.validarContextoAutenticadoService.executar(payload);

      next();
    } catch {
      next(new AutenticacaoInvalidaError());
    }
  }
}
