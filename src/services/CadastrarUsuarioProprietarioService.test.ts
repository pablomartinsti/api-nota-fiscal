import { describe, expect, it } from 'vitest';

import { Empresa, RegimeTributario } from '../entities/Empresa';
import { PerfilUsuario } from '../entities/Usuario';
import { EmailJaCadastradoError } from '../errors/EmailJaCadastradoError';
import { EmpresaInativaError } from '../errors/EmpresaInativaError';
import { EmpresaNaoEncontradaError } from '../errors/EmpresaNaoEncontradaError';
import { ProprietarioJaCadastradoError } from '../errors/ProprietarioJaCadastradoError';
import { FakeGeradorHash } from '../security/in-memory/FakeGeradorHash';
import { InMemoryEmpresaRepository } from '../repositories/in-memory/InMemoryEmpresaRepository';
import { InMemoryUsuarioRepository } from '../repositories/in-memory/InMemoryUsuarioRepository';
import { CadastrarUsuarioProprietarioService } from './CadastrarUsuarioProprietarioService';

async function criarContexto(empresaAtiva = true) {
  const empresaRepository = new InMemoryEmpresaRepository();
  const usuarioRepository = new InMemoryUsuarioRepository();
  const geradorHash = new FakeGeradorHash();
  const empresa = await empresaRepository.salvar(
    new Empresa({
      razaoSocial: 'Empresa Teste Ltda',
      cnpj: '12345678000190',
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      cidade: 'Campinas',
      uf: 'SP',
      ativo: empresaAtiva,
    }),
  );
  const service = new CadastrarUsuarioProprietarioService(
    empresaRepository,
    usuarioRepository,
    geradorHash,
  );

  return {
    empresa,
    empresaRepository,
    geradorHash,
    service,
    usuarioRepository,
  };
}

describe('CadastrarUsuarioProprietarioService', () => {
  it('deve cadastrar o primeiro proprietário com senha protegida', async () => {
    const { empresa, geradorHash, service, usuarioRepository } =
      await criarContexto();

    const usuario = await service.executar({
      empresaId: empresa.id!,
      nome: 'Maria Silva',
      email: ' MARIA@EXEMPLO.COM ',
      senha: 'senha-segura',
    });

    expect(usuario.id).toBeDefined();
    expect(usuario.empresaId).toBe(empresa.id);
    expect(usuario.email).toBe('maria@exemplo.com');
    expect(usuario.perfil).toBe(PerfilUsuario.DONO);
    expect(usuario.senhaHash).toBe('hash:senha-segura');
    expect(geradorHash.valoresRecebidos).toEqual(['senha-segura']);
    await expect(
      usuarioRepository.buscarDonoPorEmpresaId(empresa.id!),
    ).resolves.toBe(usuario);
  });

  it('deve rejeitar Empresa inexistente', async () => {
    const { service } = await criarContexto();

    await expect(
      service.executar({
        empresaId: 'empresa-inexistente',
        nome: 'Maria Silva',
        email: 'maria@exemplo.com',
        senha: 'senha-segura',
      }),
    ).rejects.toBeInstanceOf(EmpresaNaoEncontradaError);
  });

  it('deve rejeitar senha vazia sem gerar hash', async () => {
    const { empresa, geradorHash, service } = await criarContexto();

    await expect(
      service.executar({
        empresaId: empresa.id!,
        nome: 'Maria Silva',
        email: 'maria@exemplo.com',
        senha: ' ',
      }),
    ).rejects.toThrow('Senha é obrigatória.');
    expect(geradorHash.valoresRecebidos).toHaveLength(0);
  });

  it('deve rejeitar Empresa inativa', async () => {
    const { empresa, service } = await criarContexto(false);

    await expect(
      service.executar({
        empresaId: empresa.id!,
        nome: 'Maria Silva',
        email: 'maria@exemplo.com',
        senha: 'senha-segura',
      }),
    ).rejects.toBeInstanceOf(EmpresaInativaError);
  });

  it('deve rejeitar e-mail já cadastrado', async () => {
    const { empresa, empresaRepository, service } = await criarContexto();

    await service.executar({
      empresaId: empresa.id!,
      nome: 'Maria Silva',
      email: 'maria@exemplo.com',
      senha: 'senha-segura',
    });

    const outraEmpresa = await empresaRepository.salvar(
      new Empresa({
        razaoSocial: 'Outra Empresa Ltda',
        cnpj: '98765432000190',
        regimeTributario: RegimeTributario.MEI,
        cidade: 'Curitiba',
        uf: 'PR',
      }),
    );

    await expect(
      service.executar({
        empresaId: outraEmpresa.id!,
        nome: 'Outra Pessoa',
        email: ' MARIA@EXEMPLO.COM ',
        senha: 'outra-senha',
      }),
    ).rejects.toBeInstanceOf(EmailJaCadastradoError);
  });

  it('deve rejeitar segundo proprietário da mesma Empresa', async () => {
    const { empresa, service } = await criarContexto();

    await service.executar({
      empresaId: empresa.id!,
      nome: 'Maria Silva',
      email: 'maria@exemplo.com',
      senha: 'senha-segura',
    });

    await expect(
      service.executar({
        empresaId: empresa.id!,
        nome: 'João Silva',
        email: 'joao@exemplo.com',
        senha: 'outra-senha',
      }),
    ).rejects.toBeInstanceOf(ProprietarioJaCadastradoError);
  });
});
