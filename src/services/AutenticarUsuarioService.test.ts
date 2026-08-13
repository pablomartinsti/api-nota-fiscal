import { describe, expect, it, vi } from 'vitest';

import { Empresa, RegimeTributario } from '../entities/Empresa';
import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { CredenciaisInvalidasError } from '../errors/CredenciaisInvalidasError';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { ComparadorHash } from '../security/ComparadorHash';
import { GerenciadorToken, TokenPayload } from '../security/GerenciadorToken';
import { AutenticarUsuarioService } from './AutenticarUsuarioService';

async function criarContexto({
  empresaAtiva = true,
  usuarioAtivo = true,
}: {
  empresaAtiva?: boolean;
  usuarioAtivo?: boolean;
} = {}) {
  const compararSenha = vi.fn(async (valor: string, hash: string) =>
    hash === `hash:${valor}`,
  );
  const gerarToken = vi.fn(async (_payload: TokenPayload) => 'token-valido');
  const comparadorHash: ComparadorHash = {
    comparar: compararSenha,
  };
  const gerenciadorToken: GerenciadorToken = {
    gerar: gerarToken,
    verificar: vi.fn(),
  };
  const empresa = new Empresa({
    id: 'empresa-1',
    razaoSocial: 'Empresa Autenticacao Ltda',
    cnpj: '12345678000190',
    regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
    cidade: 'Campinas',
    uf: 'SP',
    ativo: empresaAtiva,
  });
  const usuario = new Usuario({
    id: 'usuario-1',
    empresaId: empresa.id!,
    nome: 'Maria Silva',
    email: 'maria@exemplo.com',
    senhaHash: 'hash:senha-segura',
    perfil: PerfilUsuario.DONO,
    ativo: usuarioAtivo,
  });
  const empresaRepository = criarEmpresaRepository(empresa);
  const usuarioRepository = criarUsuarioRepository(usuario);
  const service = new AutenticarUsuarioService(
    usuarioRepository,
    empresaRepository,
    comparadorHash,
    gerenciadorToken,
  );

  return {
    empresa,
    compararSenha,
    gerarToken,
    service,
    usuario,
  };
}

function criarEmpresaRepository(empresa: Empresa): EmpresaRepository {
  return {
    salvar: vi.fn(),
    buscarPorId: vi.fn(async (id: string) =>
      id === empresa.id ? empresa : null,
    ),
    buscarPorCnpj: vi.fn(),
  };
}

function criarUsuarioRepository(usuario: Usuario): UsuarioRepository {
  return {
    salvar: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorIdEEmpresaId: vi.fn(),
    buscarPorEmail: vi.fn(async (email: string) =>
      email === usuario.email ? usuario : null,
    ),
    buscarDonoPorEmpresaId: vi.fn(),
    listarPorEmpresaId: vi.fn(),
  };
}

describe('AutenticarUsuarioService', () => {
  it('deve autenticar usuario ativo de empresa ativa', async () => {
    const { compararSenha, empresa, gerarToken, service, usuario } =
      await criarContexto();

    const resultado = await service.executar({
      email: ' MARIA@EXEMPLO.COM ',
      senha: 'senha-segura',
    });

    expect(resultado.usuario).toBe(usuario);
    expect(resultado.token).toBe('token-valido');
    expect(compararSenha).toHaveBeenCalledWith(
      'senha-segura',
      'hash:senha-segura',
    );
    expect(gerarToken).toHaveBeenCalledWith({
        usuarioId: usuario.id,
        empresaId: empresa.id,
        perfil: PerfilUsuario.DONO,
    });
  });

  it('deve rejeitar email inexistente com erro generico', async () => {
    const { service } = await criarContexto();

    await expect(
      service.executar({
        email: 'inexistente@exemplo.com',
        senha: 'senha-segura',
      }),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
  });

  it('deve rejeitar senha incorreta com erro generico', async () => {
    const { service } = await criarContexto();

    await expect(
      service.executar({
        email: 'maria@exemplo.com',
        senha: 'senha-incorreta',
      }),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
  });

  it('deve rejeitar usuario inativo com erro generico', async () => {
    const { service } = await criarContexto({ usuarioAtivo: false });

    await expect(
      service.executar({
        email: 'maria@exemplo.com',
        senha: 'senha-segura',
      }),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
  });

  it('deve rejeitar empresa inativa com erro generico', async () => {
    const { service } = await criarContexto({ empresaAtiva: false });

    await expect(
      service.executar({
        email: 'maria@exemplo.com',
        senha: 'senha-segura',
      }),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
  });
});
