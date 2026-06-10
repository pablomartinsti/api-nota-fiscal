import { describe, expect, it } from 'vitest';

import { Empresa, RegimeTributario } from '../entities/Empresa';
import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { InMemoryEmpresaRepository } from '../repositories/in-memory/InMemoryEmpresaRepository';
import { InMemoryUsuarioRepository } from '../repositories/in-memory/InMemoryUsuarioRepository';
import { ValidarContextoAutenticadoService } from './ValidarContextoAutenticadoService';

async function criarContexto({
  empresaAtiva = true,
  usuarioAtivo = true,
}: {
  empresaAtiva?: boolean;
  usuarioAtivo?: boolean;
} = {}) {
  const empresaRepository = new InMemoryEmpresaRepository();
  const usuarioRepository = new InMemoryUsuarioRepository();
  const empresa = await empresaRepository.salvar(
    new Empresa({
      razaoSocial: 'Empresa Contexto Ltda',
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
      senhaHash: 'hash-seguro',
      perfil: PerfilUsuario.DONO,
      ativo: usuarioAtivo,
    }),
  );
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

describe('ValidarContextoAutenticadoService', () => {
  it('deve retornar o contexto atual de usuário e Empresa ativos', async () => {
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

  it('deve rejeitar usuário inexistente ou inativo', async () => {
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

  it('deve rejeitar Empresa inativa ou incompatível com o usuário', async () => {
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
