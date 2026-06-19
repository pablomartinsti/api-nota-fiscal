import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AcessoNegadoError } from '../errors/AcessoNegadoError';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { ClienteNaoEncontradoError } from '../errors/ClienteNaoEncontradoError';
import { ClienteInativoError } from '../errors/ClienteInativoError';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
import { CertificadoA1InvalidoError } from '../errors/CertificadoA1InvalidoError';
import { ChaveCriptografiaAusenteError } from '../errors/ChaveCriptografiaAusenteError';
import { CnpjJaCadastradoError } from '../errors/CnpjJaCadastradoError';
import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { ConfiguracaoFiscalAusenteError } from '../errors/ConfiguracaoFiscalAusenteError';
import { ConfiguracaoSefinNacionalAusenteError } from '../errors/ConfiguracaoSefinNacionalAusenteError';
import { CpfCnpjJaCadastradoError } from '../errors/CpfCnpjJaCadastradoError';
import { CredenciaisInvalidasError } from '../errors/CredenciaisInvalidasError';
import { EmailJaCadastradoError } from '../errors/EmailJaCadastradoError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { NotaServicoComPendenciasFiscaisError } from '../errors/NotaServicoComPendenciasFiscaisError';
import { NotaServicoNaoPodeSerAlteradaError } from '../errors/NotaServicoNaoPodeSerAlteradaError';
import { OperacaoSimuladaBloqueadaError } from '../errors/OperacaoSimuladaBloqueadaError';
import { ServicoInativoError } from '../errors/ServicoInativoError';
import { ServicoNaoEncontradoError } from '../errors/ServicoNaoEncontradoError';
import { SenhaAtualIncorretaError } from '../errors/SenhaAtualIncorretaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { UsuarioNaoEncontradoError } from '../errors/UsuarioNaoEncontradoError';
import { XmlDpsInvalidoError } from '../errors/XmlDpsInvalidoError';
import { ProducaoRealBloqueadaError } from '../errors/ProducaoRealBloqueadaError';
import { logger } from '../observability/logger';

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
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

  if (
    error instanceof ClienteNaoEncontradoError ||
    error instanceof ServicoNaoEncontradoError ||
    error instanceof NotaServicoNaoEncontradaError
  ) {
    response.status(404).json({
      message: error.message,
    });
    return;
  }

  if (error instanceof NotaServicoComPendenciasFiscaisError) {
    response.status(409).json({
      message: error.message,
      pendencias: error.pendencias,
    });
    return;
  }

  if (error instanceof ProducaoRealBloqueadaError) {
    response.status(409).json({
      message: error.message,
    });
    return;
  }

  if (error instanceof CertificadoA1EmpresaProducaoAusenteError) {
    response.status(409).json({
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
    error instanceof CredenciaisInvalidasError ||
    error instanceof SenhaAtualIncorretaError
  ) {
    response.status(401).json({
      message: error.message,
    });
    return;
  }

  if (
    error instanceof AcessoNegadoError ||
    error instanceof OperacaoSimuladaBloqueadaError
  ) {
    response.status(403).json({
      message: error.message,
    });
    return;
  }

  if (
    error instanceof ChaveCriptografiaAusenteError ||
    error instanceof ConfiguracaoFiscalAusenteError ||
    error instanceof ConfiguracaoSefinNacionalAusenteError
  ) {
    response.status(503).json({
      message: error.message,
    });
    return;
  }

  if (
    error instanceof CertificadoA1InvalidoError ||
    error instanceof CertificadoA1CnpjDivergenteError ||
    error instanceof XmlDpsInvalidoError
  ) {
    response.status(422).json({
      message: error.message,
    });
    return;
  }

  if (error instanceof ComunicacaoNfseError) {
    response.status(502).json({
      message: error.message,
    });
    return;
  }

  if (
    error instanceof EmailJaCadastradoError ||
    error instanceof CpfCnpjJaCadastradoError ||
    error instanceof ClienteInativoError ||
    error instanceof ServicoInativoError ||
    error instanceof NotaServicoNaoPodeSerAlteradaError ||
    error instanceof TransicaoStatusNotaInvalidaError
  ) {
    response.status(409).json({
      message: error.message,
    });
    return;
  }

  logger.error({
    evento: 'erro_inesperado',
    contexto: {
      method: request.method,
      path: request.path,
      usuarioId: request.autenticacao?.usuarioId,
      empresaId: request.autenticacao?.empresaId,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
  });

  response.status(500).json({
    message: 'Erro interno do servidor.',
  });
};
