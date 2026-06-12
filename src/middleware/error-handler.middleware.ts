import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AcessoNegadoError } from '../errors/AcessoNegadoError';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CnpjJaCadastradoError } from '../errors/CnpjJaCadastradoError';
import { CredenciaisInvalidasError } from '../errors/CredenciaisInvalidasError';
import { EmailJaCadastradoError } from '../errors/EmailJaCadastradoError';
import { EmpresaInativaError } from '../errors/EmpresaInativaError';
import { EmpresaNaoEncontradaError } from '../errors/EmpresaNaoEncontradaError';
import { ProprietarioJaCadastradoError } from '../errors/ProprietarioJaCadastradoError';
import { UsuarioNaoEncontradoError } from '../errors/UsuarioNaoEncontradoError';

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

  if (error instanceof UsuarioNaoEncontradoError) {
    response.status(404).json({
      message: error.message,
    });
    return;
  }

  if (
    error instanceof AutenticacaoInvalidaError ||
    error instanceof CredenciaisInvalidasError
  ) {
    response.status(401).json({
      message: error.message,
    });
    return;
  }

  if (error instanceof AcessoNegadoError) {
    response.status(403).json({
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
