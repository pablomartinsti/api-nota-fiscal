import { describe, expect, it } from 'vitest';

import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { AcessoNegadoError } from '../errors/AcessoNegadoError';
import { PoliticaGestaoUsuario } from './PoliticaGestaoUsuario';

const politica = new PoliticaGestaoUsuario();

function criarUsuario(perfil: PerfilUsuario): Usuario {
  return new Usuario({
    id: `usuario-${perfil}`,
    empresaId: 'empresa-1',
    nome: 'Usuário Teste',
    email: `${perfil.toLowerCase()}@exemplo.com`,
    senhaHash: 'hash-seguro',
    perfil,
  });
}

describe('PoliticaGestaoUsuario', () => {
  it('deve permitir que DONO gerencie ADMIN e OPERADOR, mas não DONO', () => {
    expect(() =>
      politica.validarCadastro(PerfilUsuario.DONO, PerfilUsuario.ADMIN),
    ).not.toThrow();
    expect(() =>
      politica.validarCadastro(PerfilUsuario.DONO, PerfilUsuario.OPERADOR),
    ).not.toThrow();
    expect(() =>
      politica.validarCadastro(PerfilUsuario.DONO, PerfilUsuario.DONO),
    ).toThrow(AcessoNegadoError);
  });

  it('deve permitir que ADMIN gerencie somente OPERADOR', () => {
    const operador = criarUsuario(PerfilUsuario.OPERADOR);

    expect(() =>
      politica.validarCadastro(PerfilUsuario.ADMIN, PerfilUsuario.OPERADOR),
    ).not.toThrow();
    expect(() =>
      politica.validarCadastro(PerfilUsuario.ADMIN, PerfilUsuario.ADMIN),
    ).toThrow(AcessoNegadoError);
    expect(() =>
      politica.validarAlteracaoStatus(
        {
          usuarioId: 'admin-1',
          empresaId: 'empresa-1',
          perfil: PerfilUsuario.ADMIN,
        },
        operador,
        false,
      ),
    ).not.toThrow();
  });

  it('deve impedir OPERADOR de gerenciar usuários', () => {
    expect(() => politica.validarListagem(PerfilUsuario.OPERADOR)).toThrow(
      AcessoNegadoError,
    );
    expect(() =>
      politica.validarCadastro(PerfilUsuario.OPERADOR, PerfilUsuario.OPERADOR),
    ).toThrow(AcessoNegadoError);
  });

  it('deve impedir alteração do proprietário e autodesativação', () => {
    const dono = criarUsuario(PerfilUsuario.DONO);
    const admin = criarUsuario(PerfilUsuario.ADMIN);

    expect(() =>
      politica.validarAlteracaoPerfil(
        PerfilUsuario.DONO,
        dono,
        PerfilUsuario.ADMIN,
      ),
    ).toThrow(AcessoNegadoError);
    expect(() =>
      politica.validarAlteracaoStatus(
        {
          usuarioId: admin.id!,
          empresaId: admin.empresaId,
          perfil: PerfilUsuario.DONO,
        },
        admin,
        false,
      ),
    ).toThrow(AcessoNegadoError);
  });
});
