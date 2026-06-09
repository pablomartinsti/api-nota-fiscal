import { Empresa } from '../../entities/Empresa';
import { EmpresaRepository } from '../EmpresaRepository';

export class InMemoryEmpresaRepository implements EmpresaRepository {
  items: Empresa[] = [];

  async salvar(empresa: Empresa): Promise<void> {
    const index = empresa.id
      ? this.items.findIndex((item) => item.id === empresa.id)
      : -1;

    if (index >= 0) {
      this.items[index] = empresa;
      return;
    }

    this.items.push(empresa);
  }

  async buscarPorId(id: string): Promise<Empresa | null> {
    return this.items.find((empresa) => empresa.id === id) ?? null;
  }

  async buscarPorCnpj(cnpj: string): Promise<Empresa | null> {
    return this.items.find((empresa) => empresa.cnpj === cnpj) ?? null;
  }
}
