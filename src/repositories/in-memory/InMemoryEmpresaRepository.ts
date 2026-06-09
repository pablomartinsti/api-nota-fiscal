import { randomUUID } from 'node:crypto';

import { Empresa } from '../../entities/Empresa';
import { EmpresaRepository } from '../EmpresaRepository';

export class InMemoryEmpresaRepository implements EmpresaRepository {
  items: Empresa[] = [];

  async salvar(empresa: Empresa): Promise<Empresa> {
    const index = empresa.id
      ? this.items.findIndex((item) => item.id === empresa.id)
      : -1;

    if (index >= 0) {
      this.items[index] = empresa;
      return empresa;
    }

    const empresaPersistida = empresa.id
      ? empresa
      : new Empresa({
          id: randomUUID(),
          razaoSocial: empresa.razaoSocial,
          nomeFantasia: empresa.nomeFantasia,
          cnpj: empresa.cnpj,
          inscricaoMunicipal: empresa.inscricaoMunicipal,
          regimeTributario: empresa.regimeTributario,
          cidade: empresa.cidade,
          uf: empresa.uf,
          ativo: empresa.ativo,
          createdAt: empresa.createdAt,
          updatedAt: empresa.updatedAt,
        });

    this.items.push(empresaPersistida);

    return empresaPersistida;
  }

  async buscarPorId(id: string): Promise<Empresa | null> {
    return this.items.find((empresa) => empresa.id === id) ?? null;
  }

  async buscarPorCnpj(cnpj: string): Promise<Empresa | null> {
    return this.items.find((empresa) => empresa.cnpj === cnpj) ?? null;
  }
}
