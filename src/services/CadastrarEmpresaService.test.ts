import { describe, expect, it } from 'vitest';

import { RegimeTributario } from '../entities/Empresa';
import { InMemoryEmpresaRepository } from '../repositories/in-memory/InMemoryEmpresaRepository';
import { CadastrarEmpresaService } from './CadastrarEmpresaService';

const dadosEmpresa = {
  razaoSocial: 'Empresa Teste Ltda',
  cnpj: '12.345.678/0001-90',
  regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
  cidade: 'Campinas',
  uf: 'SP',
};

describe('CadastrarEmpresaService', () => {
  it('deve cadastrar e retornar uma empresa válida', async () => {
    const repository = new InMemoryEmpresaRepository();
    const service = new CadastrarEmpresaService(repository);

    const empresa = await service.executar(dadosEmpresa);

    expect(empresa.id).toBeDefined();
    expect(empresa.cnpj).toBe('12345678000190');
    await expect(repository.buscarPorCnpj(empresa.cnpj)).resolves.toBe(empresa);
  });

  it('deve rejeitar CNPJ já cadastrado', async () => {
    const repository = new InMemoryEmpresaRepository();
    const service = new CadastrarEmpresaService(repository);

    await service.executar(dadosEmpresa);

    await expect(service.executar(dadosEmpresa)).rejects.toThrow(
      'Já existe uma empresa cadastrada com este CNPJ.',
    );
  });
});
