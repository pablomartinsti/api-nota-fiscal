import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { CnpjJaCadastradoError } from '../errors/CnpjJaCadastradoError';

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: 'Dados inválidos.',
    });
    return;
  }

  if (error instanceof CnpjJaCadastradoError) {
    response.status(409).json({
      message: error.message,
    });
    return;
  }

  response.status(500).json({
    message: 'Erro interno do servidor.',
  });
};
