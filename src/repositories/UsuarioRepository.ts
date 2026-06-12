import { Usuario } from '../entities/Usuario';

export interface UsuarioRepository {
  salvar(usuario: Usuario): Promise<Usuario>;
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarPorIdEEmpresaId(id: string, empresaId: string): Promise<Usuario | null>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarDonoPorEmpresaId(empresaId: string): Promise<Usuario | null>;
  listarPorEmpresaId(empresaId: string): Promise<Usuario[]>;
}
