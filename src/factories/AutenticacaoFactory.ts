import { AutenticarUsuarioController } from '../controllers/AutenticarUsuarioController';
import { AutenticarUsuarioGoogleController } from '../controllers/AutenticarUsuarioGoogleController';
import { GestaoContaController } from '../controllers/GestaoContaController';
import { ObterPerfilAutenticadoController } from '../controllers/ObterPerfilAutenticadoController';
import { obterJwtSecret } from '../config/auth';
import { env } from '../config/env';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { PrismaUsuarioRepository } from '../database/repositories/PrismaUsuarioRepository';
import { AutenticacaoMiddleware } from '../middleware/autenticacao.middleware';
import { BcryptComparadorHash } from '../security/BcryptComparadorHash';
import { BcryptGeradorHash } from '../security/BcryptGeradorHash';
import { GoogleIdentityTokenVerifier } from '../security/GoogleIdentityTokenVerifier';
import { JwtGerenciadorToken } from '../security/JwtGerenciadorToken';
import { AutenticarUsuarioGoogleService } from '../services/AutenticarUsuarioGoogleService';
import { AutenticarUsuarioService } from '../services/AutenticarUsuarioService';
import { AlterarSenhaUsuarioAutenticadoService } from '../services/AlterarSenhaUsuarioAutenticadoService';
import { AtualizarContaUsuarioService } from '../services/AtualizarContaUsuarioService';
import { ObterPerfilAutenticadoService } from '../services/ObterPerfilAutenticadoService';
import { ValidarContextoAutenticadoService } from '../services/ValidarContextoAutenticadoService';

function criarDependenciasAutenticacao() {
  const usuarioRepository = new PrismaUsuarioRepository();
  const empresaRepository = new PrismaEmpresaRepository();
  const gerenciadorToken = new JwtGerenciadorToken(obterJwtSecret());

  return {
    usuarioRepository,
    empresaRepository,
    gerenciadorToken,
  };
}

export function criarAutenticarUsuarioController(): AutenticarUsuarioController {
  const { usuarioRepository, empresaRepository, gerenciadorToken } =
    criarDependenciasAutenticacao();
  const service = new AutenticarUsuarioService(
    usuarioRepository,
    empresaRepository,
    new BcryptComparadorHash(),
    gerenciadorToken,
  );

  return new AutenticarUsuarioController(service);
}

export function criarAutenticarUsuarioGoogleController(): AutenticarUsuarioGoogleController {
  const { usuarioRepository, empresaRepository, gerenciadorToken } =
    criarDependenciasAutenticacao();
  const verificadorTokenGoogle = env.GOOGLE_CLIENT_ID
    ? new GoogleIdentityTokenVerifier(env.GOOGLE_CLIENT_ID)
    : undefined;
  const service = new AutenticarUsuarioGoogleService(
    usuarioRepository,
    empresaRepository,
    gerenciadorToken,
    verificadorTokenGoogle,
  );

  return new AutenticarUsuarioGoogleController(service);
}

export function criarAutenticacaoMiddleware(): AutenticacaoMiddleware {
  const { usuarioRepository, empresaRepository, gerenciadorToken } =
    criarDependenciasAutenticacao();
  const service = new ValidarContextoAutenticadoService(
    usuarioRepository,
    empresaRepository,
  );

  return new AutenticacaoMiddleware(gerenciadorToken, service);
}

export function criarObterPerfilAutenticadoController(): ObterPerfilAutenticadoController {
  const { usuarioRepository, empresaRepository } =
    criarDependenciasAutenticacao();
  const service = new ObterPerfilAutenticadoService(
    usuarioRepository,
    empresaRepository,
  );

  return new ObterPerfilAutenticadoController(service);
}

export function criarGestaoContaController(): GestaoContaController {
  const { usuarioRepository } = criarDependenciasAutenticacao();

  return new GestaoContaController(
    new AtualizarContaUsuarioService(usuarioRepository),
    new AlterarSenhaUsuarioAutenticadoService(
      usuarioRepository,
      new BcryptComparadorHash(),
      new BcryptGeradorHash(),
    ),
  );
}
