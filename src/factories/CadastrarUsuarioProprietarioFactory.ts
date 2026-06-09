import { CadastrarUsuarioProprietarioController } from '../controllers/CadastrarUsuarioProprietarioController';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { PrismaUsuarioRepository } from '../database/repositories/PrismaUsuarioRepository';
import { BcryptGeradorHash } from '../security/BcryptGeradorHash';
import { CadastrarUsuarioProprietarioService } from '../services/CadastrarUsuarioProprietarioService';

export function criarCadastrarUsuarioProprietarioController(): CadastrarUsuarioProprietarioController {
  const empresaRepository = new PrismaEmpresaRepository();
  const usuarioRepository = new PrismaUsuarioRepository();
  const geradorHash = new BcryptGeradorHash();
  const service = new CadastrarUsuarioProprietarioService(
    empresaRepository,
    usuarioRepository,
    geradorHash,
  );

  return new CadastrarUsuarioProprietarioController(service);
}
