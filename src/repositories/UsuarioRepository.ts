import { Usuario } from '../entities/Usuario';

export interface UsuarioRepository {
  salvar(usuario: Usuario): Promise<Usuario>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarDonoPorEmpresaId(empresaId: string): Promise<Usuario | null>;
}
