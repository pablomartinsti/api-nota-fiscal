import { describe, expect, it } from 'vitest';

import { Empresa, RegimeTributario } from '../entities/Empresa';
import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { CredenciaisInvalidasError } from '../errors/CredenciaisInvalidasError';
import { InMemoryEmpresaRepository } from '../repositories/in-memory/InMemoryEmpresaRepository';
import { InMemoryUsuarioRepository } from '../repositories/in-memory/InMemoryUsuarioRepository';
import { FakeComparadorHash } from '../security/in-memory/FakeComparadorHash';
import { FakeGerenciadorToken } from '../security/in-memory/FakeGerenciadorToken';
import { AutenticarUsuarioService } from './AutenticarUsuarioService';

async function criarContexto({
  empresaAtiva = true,
  usuarioAtivo = true,
}: {
  empresaAtiva?: boolean;
  usuarioAtivo?: boolean;
} = {}) {
  const empresaRepository = new InMemoryEmpresaRepository();
  const usuarioRepository = new InMemoryUsuarioRepository();
  const comparadorHash = new FakeComparadorHash();
  const gerenciadorToken = new FakeGerenciadorToken();
  const empresa = await empresaRepository.salvar(
    new Empresa({
      razaoSocial: 'Empresa Autenticação Ltda',
      cnpj: '12345678000190',
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      cidade: 'Campinas',
      uf: 'SP',
      ativo: empresaAtiva,
    }),
  );
  const usuario = await usuarioRepository.salvar(
    new Usuario({
      empresaId: empresa.id!,
      nome: 'Maria Silva',
      email: 'maria@exemplo.com',
      senhaHash: 'hash:senha-segura',
      perfil: PerfilUsuario.DONO,
      ativo: usuarioAtivo,
    }),
  );
  const service = new AutenticarUsuarioService(
    usuarioRepository,
    empresaRepository,
    comparadorHash,
    gerenciadorToken,
  );

  return {
    comparadorHash,
    empresa,
    gerenciadorToken,
    service,
    usuario,
  };
}

describe('AutenticarUsuarioService', () => {
  it('deve autenticar usuário ativo de Empresa ativa', async () => {
    const { comparadorHash, empresa, gerenciadorToken, service, usuario } =
      await criarContexto();

    const resultado = await service.executar({
      email: ' MARIA@EXEMPLO.COM ',
      senha: 'senha-segura',
    });

    expect(resultado.usuario).toBe(usuario);
    expect(resultado.token).toBe('token-valido');
    expect(comparadorHash.valoresRecebidos).toEqual([
      {
        valor: 'senha-segura',
        hash: 'hash:senha-segura',
      },
    ]);
    expect(gerenciadorToken.payloadsGerados).toEqual([
      {
        usuarioId: usuario.id,
        empresaId: empresa.id,
        perfil: PerfilUsuario.DONO,
      },
    ]);
  });

  it('deve rejeitar e-mail inexistente com erro genérico', async () => {
    const { service } = await criarContexto();

    await expect(
      service.executar({
        email: 'inexistente@exemplo.com',
        senha: 'senha-segura',
      }),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
  });

  it('deve rejeitar senha incorreta com erro genérico', async () => {
    const { service } = await criarContexto();

    await expect(
      service.executar({
        email: 'maria@exemplo.com',
        senha: 'senha-incorreta',
      }),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
  });

  it('deve rejeitar usuário inativo com erro genérico', async () => {
    const { service } = await criarContexto({ usuarioAtivo: false });

    await expect(
      service.executar({
        email: 'maria@exemplo.com',
        senha: 'senha-segura',
      }),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
  });

  it('deve rejeitar Empresa inativa com erro genérico', async () => {
    const { service } = await criarContexto({ empresaAtiva: false });

    await expect(
      service.executar({
        email: 'maria@exemplo.com',
        senha: 'senha-segura',
      }),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
  });
});
