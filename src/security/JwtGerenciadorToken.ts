import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

import { PerfilUsuario } from '../entities/Usuario';
import { GerenciadorToken, TokenPayload } from './GerenciadorToken';

export class JwtGerenciadorToken implements GerenciadorToken {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: SignOptions['expiresIn'] = '1h',
  ) {
    if (!secret.trim()) {
      throw new Error('JWT_SECRET não está definida.');
    }
  }

  async gerar(payload: TokenPayload): Promise<string> {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
    });
  }

  async verificar(token: string): Promise<TokenPayload> {
    const payload = jwt.verify(token, this.secret);

    if (!this.payloadValido(payload)) {
      throw new Error('Token inválido.');
    }

    return {
      usuarioId: payload.usuarioId,
      empresaId: payload.empresaId,
      perfil: payload.perfil,
    };
  }

  private payloadValido(
    payload: string | JwtPayload,
  ): payload is JwtPayload & TokenPayload {
    return (
      typeof payload !== 'string' &&
      typeof payload.usuarioId === 'string' &&
      typeof payload.empresaId === 'string' &&
      Object.values(PerfilUsuario).includes(payload.perfil as PerfilUsuario)
    );
  }
}
