import { describe, expect, it, vi } from 'vitest';

import { Empresa, RegimeTributario } from '../entities/Empresa';
import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { CredenciaisInvalidasError } from '../errors/CredenciaisInvalidasError';
import { LoginGoogleNaoConfiguradoError } from '../errors/LoginGoogleNaoConfiguradoError';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { GerenciadorToken } from '../security/GerenciadorToken';
import { VerificadorTokenGoogle } from '../security/GoogleIdentityTokenVerifier';
import { AutenticarUsuarioGoogleService } from './AutenticarUsuarioGoogleService';

describe('AutenticarUsuarioGoogleService', () => {
  it('deve autenticar usuario ativo quando token Google pertence ao e-mail cadastrado', async () => {
    const { service, gerenciadorToken } = criarService();

    const resultado = await service.executar({ credential: 'token-google' });

    expect(resultado.token).toBe('jwt-google');
    expect(resultado.usuario.email).toBe('dono@empresa.com');
    expect(gerenciadorToken.gerar).toHaveBeenCalledWith({
      usuarioId: 'usuario-1',
      empresaId: 'empresa-1',
      perfil: PerfilUsuario.DONO,
    });
  });

  it('deve rejeitar token Google sem e-mail verificado', async () => {
    const { service } = criarService({
      verificadorTokenGoogle: criarVerificador({
        email: 'dono@empresa.com',
        emailVerified: false,
      }),
    });

    await expect(
      service.executar({ credential: 'token-google' }),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
  });

  it('deve rejeitar quando e-mail Google nao existir no sistema', async () => {
    const { service } = criarService({ usuario: null });

    await expect(
      service.executar({ credential: 'token-google' }),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
  });

  it('deve rejeitar quando empresa estiver inativa', async () => {
    const empresa = criarEmpresa();
    empresa.desativar();
    const { service } = criarService({ empresa });

    await expect(
      service.executar({ credential: 'token-google' }),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError);
  });

  it('deve falhar quando login Google nao estiver configurado', async () => {
    const { service } = criarService({ verificadorTokenGoogle: undefined });

    await expect(
      service.executar({ credential: 'token-google' }),
    ).rejects.toBeInstanceOf(LoginGoogleNaoConfiguradoError);
  });
});

function criarService(opcoes: {
  usuario?: Usuario | null;
  empresa?: Empresa | null;
  verificadorTokenGoogle?: VerificadorTokenGoogle;
} = {}) {
  const usuario = opcoes.usuario === undefined ? criarUsuario() : opcoes.usuario;
  const empresa = opcoes.empresa === undefined ? criarEmpresa() : opcoes.empresa;
  const verificadorTokenGoogle =
    'verificadorTokenGoogle' in opcoes
      ? opcoes.verificadorTokenGoogle
      : criarVerificador({
          email: 'dono@empresa.com',
          emailVerified: true,
        });
  const usuarioRepository: UsuarioRepository = {
    salvar: vi.fn(),
    buscarPorId: vi.fn(),
    buscarPorIdEEmpresaId: vi.fn(),
    buscarPorEmail: vi.fn().mockResolvedValue(usuario),
    buscarDonoPorEmpresaId: vi.fn(),
    listarPorEmpresaId: vi.fn(),
  };
  const empresaRepository: EmpresaRepository = {
    salvar: vi.fn(),
    buscarPorId: vi.fn().mockResolvedValue(empresa),
    buscarPorCnpj: vi.fn(),
  };
  const gerenciadorToken: GerenciadorToken = {
    gerar: vi.fn().mockResolvedValue('jwt-google'),
    verificar: vi.fn(),
  };

  return {
    service: new AutenticarUsuarioGoogleService(
      usuarioRepository,
      empresaRepository,
      gerenciadorToken,
      verificadorTokenGoogle,
    ),
    gerenciadorToken,
  };
}

function criarUsuario() {
  return new Usuario({
    id: 'usuario-1',
    empresaId: 'empresa-1',
    nome: 'Dono Empresa',
    email: 'dono@empresa.com',
    senhaHash: 'hash-seguro',
    perfil: PerfilUsuario.DONO,
  });
}

function criarEmpresa() {
  return new Empresa({
    id: 'empresa-1',
    razaoSocial: 'Empresa Google Ltda',
    cnpj: '12345678000190',
    regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
    cidade: 'Uberlandia',
    uf: 'MG',
  });
}

function criarVerificador(payload: {
  email: string;
  emailVerified: boolean;
}): VerificadorTokenGoogle {
  return {
    verificar: vi.fn().mockResolvedValue(payload),
  };
}
