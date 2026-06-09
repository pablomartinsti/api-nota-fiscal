import { Empresa } from '../entities/Empresa';

export interface EmpresaRepository {
  salvar(empresa: Empresa): Promise<Empresa>;
  buscarPorId(id: string): Promise<Empresa | null>;
  buscarPorCnpj(cnpj: string): Promise<Empresa | null>;
}
