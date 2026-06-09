import { describe, expect, it } from 'vitest';

import { PerfilUsuario, Usuario } from './Usuario';

const criarUsuario = () =>
  new Usuario({
    empresaId: 'empresa-1',
    nome: 'Maria Silva',
    email: 'maria@exemplo.com',
    senhaHash: 'hash-seguro',
    perfil: PerfilUsuario.ADMIN,
  });

describe('Usuario', () => {
  it('deve criar um usuário válido e ativo por padrão', () => {
    const usuario = criarUsuario();

    expect(usuario.empresaId).toBe('empresa-1');
    expect(usuario.nome).toBe('Maria Silva');
    expect(usuario.ativo).toBe(true);
    expect(usuario.createdAt).toBeInstanceOf(Date);
    expect(usuario.updatedAt).toBeInstanceOf(Date);
  });

  it('deve normalizar empresa, nome e e-mail', () => {
    const usuario = new Usuario({
      empresaId: ' empresa-1 ',
      nome: ' Maria Silva ',
      email: ' MARIA@EXEMPLO.COM ',
      senhaHash: 'hash-seguro',
      perfil: PerfilUsuario.ADMIN,
    });

    expect(usuario.empresaId).toBe('empresa-1');
    expect(usuario.nome).toBe('Maria Silva');
    expect(usuario.email).toBe('maria@exemplo.com');
  });

  it('deve rejeitar empresa vazia', () => {
    expect(
      () =>
        new Usuario({
          empresaId: ' ',
          nome: 'Maria Silva',
          email: 'maria@exemplo.com',
          senhaHash: 'hash-seguro',
          perfil: PerfilUsuario.ADMIN,
        }),
    ).toThrow('Empresa é obrigatória.');
  });

  it('deve rejeitar nome vazio', () => {
    expect(
      () =>
        new Usuario({
          empresaId: 'empresa-1',
          nome: ' ',
          email: 'maria@exemplo.com',
          senhaHash: 'hash-seguro',
          perfil: PerfilUsuario.ADMIN,
        }),
    ).toThrow('Nome é obrigatório.');
  });

  it('deve rejeitar e-mail inválido', () => {
    expect(
      () =>
        new Usuario({
          empresaId: 'empresa-1',
          nome: 'Maria Silva',
          email: 'email-invalido',
          senhaHash: 'hash-seguro',
          perfil: PerfilUsuario.ADMIN,
        }),
    ).toThrow('E-mail inválido.');
  });

  it('deve rejeitar hash da senha vazio', () => {
    expect(
      () =>
        new Usuario({
          empresaId: 'empresa-1',
          nome: 'Maria Silva',
          email: 'maria@exemplo.com',
          senhaHash: ' ',
          perfil: PerfilUsuario.ADMIN,
        }),
    ).toThrow('Hash da senha é obrigatório.');
  });

  it('deve rejeitar perfil inválido', () => {
    expect(
      () =>
        new Usuario({
          empresaId: 'empresa-1',
          nome: 'Maria Silva',
          email: 'maria@exemplo.com',
          senhaHash: 'hash-seguro',
          perfil: 'INVALIDO' as PerfilUsuario,
        }),
    ).toThrow('Perfil de usuário inválido.');
  });

  it('deve alterar nome, e-mail, hash e perfil', () => {
    const usuario = criarUsuario();

    usuario.alterarNome('Maria Souza');
    usuario.alterarEmail(' NOVO@EXEMPLO.COM ');
    usuario.alterarSenhaHash('novo-hash');
    usuario.alterarPerfil(PerfilUsuario.OPERADOR);

    expect(usuario.nome).toBe('Maria Souza');
    expect(usuario.email).toBe('novo@exemplo.com');
    expect(usuario.senhaHash).toBe('novo-hash');
    expect(usuario.perfil).toBe(PerfilUsuario.OPERADOR);
  });

  it('deve preservar exatamente o hash recebido', () => {
    const hash = '  hash-opaco  ';
    const usuario = new Usuario({
      empresaId: 'empresa-1',
      nome: 'Maria Silva',
      email: 'maria@exemplo.com',
      senhaHash: hash,
      perfil: PerfilUsuario.ADMIN,
    });

    expect(usuario.senhaHash).toBe(hash);

    const novoHash = '  novo-hash-opaco  ';
    usuario.alterarSenhaHash(novoHash);

    expect(usuario.senhaHash).toBe(novoHash);
  });

  it('deve manter empresaId após alterações', () => {
    const usuario = criarUsuario();
    const empresaIdOriginal = usuario.empresaId;

    usuario.alterarNome('Maria Souza');
    usuario.alterarEmail('novo@exemplo.com');
    usuario.alterarPerfil(PerfilUsuario.DONO);

    expect(usuario.empresaId).toBe(empresaIdOriginal);
  });

  it('deve ativar e desativar o usuário', () => {
    const usuario = criarUsuario();

    usuario.desativar();
    expect(usuario.ativo).toBe(false);

    usuario.ativar();
    expect(usuario.ativo).toBe(true);
  });
});
