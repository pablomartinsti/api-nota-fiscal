import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { CnpjJaCadastradoError } from '../errors/CnpjJaCadastradoError';
import { EmailJaCadastradoError } from '../errors/EmailJaCadastradoError';
import { EmpresaInativaError } from '../errors/EmpresaInativaError';
import { EmpresaNaoEncontradaError } from '../errors/EmpresaNaoEncontradaError';
import { ProprietarioJaCadastradoError } from '../errors/ProprietarioJaCadastradoError';

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

  if (error instanceof EmpresaNaoEncontradaError) {
    response.status(404).json({
      message: error.message,
    });
    return;
  }

  if (
    error instanceof EmailJaCadastradoError ||
    error instanceof EmpresaInativaError ||
    error instanceof ProprietarioJaCadastradoError
  ) {
    response.status(409).json({
      message: error.message,
    });
    return;
  }

  response.status(500).json({
    message: 'Erro interno do servidor.',
  });
};
