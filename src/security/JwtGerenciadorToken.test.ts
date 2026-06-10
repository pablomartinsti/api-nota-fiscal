import { describe, expect, it } from 'vitest';

import { PerfilUsuario } from '../entities/Usuario';
import { JwtGerenciadorToken } from './JwtGerenciadorToken';

const payload = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

describe('JwtGerenciadorToken', () => {
  it('deve gerar e verificar um token assinado com expiração', async () => {
    const gerenciadorToken = new JwtGerenciadorToken('segredo-teste', '1h');

    const token = await gerenciadorToken.gerar(payload);

    expect(token).toEqual(expect.any(String));
    await expect(gerenciadorToken.verificar(token)).resolves.toEqual(payload);
  });

  it('deve rejeitar token inválido ou expirado', async () => {
    const gerenciadorToken = new JwtGerenciadorToken('segredo-teste', '-1s');
    const tokenExpirado = await gerenciadorToken.gerar(payload);

    await expect(
      gerenciadorToken.verificar('token-invalido'),
    ).rejects.toThrow();
    await expect(gerenciadorToken.verificar(tokenExpirado)).rejects.toThrow();
  });

  it('deve exigir segredo para assinar tokens', () => {
    expect(() => new JwtGerenciadorToken('')).toThrow(
      'JWT_SECRET não está definida.',
    );
  });
});
