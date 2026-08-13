import { describe, expect, it, vi } from 'vitest';

import { Empresa, RegimeTributario } from '../../entities/Empresa';
import { PerfilUsuario, Usuario } from '../../entities/Usuario';
import { AutenticacaoInvalidaError } from '../../errors/AutenticacaoInvalidaError';
import { EmpresaRepository } from '../../repositories/EmpresaRepository';
import { UsuarioRepository } from '../../repositories/UsuarioRepository';
import { ValidarContextoAutenticadoService } from './ValidarContextoAutenticadoService';

async function criarContexto({
  empresaAtiva = true,
  usuarioAtivo = true,
}: {
  empresaAtiva?: boolean;
  usuarioAtivo?: boolean;
} = {}) {
  const empresa = new Empresa({
    id: 'empresa-1',
    razaoSocial: 'Empresa Contexto Ltda',
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
    senhaHash: 'hash-seguro',
    perfil: PerfilUsuario.DONO,
    ativo: usuarioAtivo,
  });
  const empresaRepository = criarEmpresaRepository(empresa);
  const usuarioRepository = criarUsuarioRepository(usuario);
  const service = new ValidarContextoAutenticadoService(
    usuarioRepository,
    empresaRepository,
  );

  return {
    empresa,
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
    buscarPorId: vi.fn(async (id: string) =>
      id === usuario.id ? usuario : null,
    ),
    buscarPorIdEEmpresaId: vi.fn(),
    buscarPorEmail: vi.fn(),
    buscarDonoPorEmpresaId: vi.fn(),
    listarPorEmpresaId: vi.fn(),
  };
}

describe('ValidarContextoAutenticadoService', () => {
  it('deve retornar o contexto atual de usuario e empresa ativos', async () => {
    const { empresa, service, usuario } = await criarContexto();

    const contexto = await service.executar({
      usuarioId: usuario.id!,
      empresaId: empresa.id!,
      perfil: PerfilUsuario.OPERADOR,
    });

    expect(contexto).toEqual({
      usuarioId: usuario.id,
      empresaId: empresa.id,
      perfil: PerfilUsuario.DONO,
    });
  });

  it('deve rejeitar usuario inexistente ou inativo', async () => {
    const contextoAtivo = await criarContexto();
    const contextoInativo = await criarContexto({ usuarioAtivo: false });

    await expect(
      contextoAtivo.service.executar({
        usuarioId: 'usuario-inexistente',
        empresaId: contextoAtivo.empresa.id!,
        perfil: PerfilUsuario.DONO,
      }),
    ).rejects.toBeInstanceOf(AutenticacaoInvalidaError);
    await expect(
      contextoInativo.service.executar({
        usuarioId: contextoInativo.usuario.id!,
        empresaId: contextoInativo.empresa.id!,
        perfil: PerfilUsuario.DONO,
      }),
    ).rejects.toBeInstanceOf(AutenticacaoInvalidaError);
  });

  it('deve rejeitar empresa inativa ou incompativel com o usuario', async () => {
    const contextoAtivo = await criarContexto();
    const contextoInativo = await criarContexto({ empresaAtiva: false });

    await expect(
      contextoAtivo.service.executar({
        usuarioId: contextoAtivo.usuario.id!,
        empresaId: 'outra-empresa',
        perfil: PerfilUsuario.DONO,
      }),
    ).rejects.toBeInstanceOf(AutenticacaoInvalidaError);
    await expect(
      contextoInativo.service.executar({
        usuarioId: contextoInativo.usuario.id!,
        empresaId: contextoInativo.empresa.id!,
        perfil: PerfilUsuario.DONO,
      }),
    ).rejects.toBeInstanceOf(AutenticacaoInvalidaError);
  });
});
