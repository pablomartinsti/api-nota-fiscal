import { GestaoUsuarioController } from '../controllers/GestaoUsuarioController';
import { PrismaUsuarioRepository } from '../database/repositories/PrismaUsuarioRepository';
import { PoliticaGestaoUsuario } from '../policies/PoliticaGestaoUsuario';
import { BcryptGeradorHash } from '../security/BcryptGeradorHash';
import { AlterarPerfilUsuarioService } from '../services/AlterarPerfilUsuarioService';
import { AlterarStatusUsuarioService } from '../services/AlterarStatusUsuarioService';
import { CadastrarUsuarioEmpresaService } from '../services/CadastrarUsuarioEmpresaService';
import { ListarUsuariosEmpresaService } from '../services/ListarUsuariosEmpresaService';

export function criarGestaoUsuarioController(): GestaoUsuarioController {
  const usuarioRepository = new PrismaUsuarioRepository();
  const politica = new PoliticaGestaoUsuario();

  return new GestaoUsuarioController(
    new CadastrarUsuarioEmpresaService(
      usuarioRepository,
      new BcryptGeradorHash(),
      politica,
    ),
    new ListarUsuariosEmpresaService(usuarioRepository, politica),
    new AlterarPerfilUsuarioService(usuarioRepository, politica),
    new AlterarStatusUsuarioService(usuarioRepository, politica),
  );
}
