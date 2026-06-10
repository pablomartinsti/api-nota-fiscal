import { AutenticarUsuarioController } from '../controllers/AutenticarUsuarioController';
import { ObterPerfilAutenticadoController } from '../controllers/ObterPerfilAutenticadoController';
import { obterJwtSecret } from '../config/auth';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { PrismaUsuarioRepository } from '../database/repositories/PrismaUsuarioRepository';
import { AutenticacaoMiddleware } from '../middleware/autenticacao.middleware';
import { BcryptComparadorHash } from '../security/BcryptComparadorHash';
import { JwtGerenciadorToken } from '../security/JwtGerenciadorToken';
import { AutenticarUsuarioService } from '../services/AutenticarUsuarioService';
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
