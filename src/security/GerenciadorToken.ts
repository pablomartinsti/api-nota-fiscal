import { PerfilUsuario } from '../entities/Usuario';

export interface TokenPayload {
  usuarioId: string;
  empresaId: string;
  perfil: PerfilUsuario;
}

export interface GerenciadorToken {
  gerar(payload: TokenPayload): Promise<string>;
  verificar(token: string): Promise<TokenPayload>;
}
