import { Empresa } from '../entities/Empresa';

export interface EmpresaRepository {
  salvar(empresa: Empresa): Promise<void>;
  buscarPorId(id: string): Promise<Empresa | null>;
  buscarPorCnpj(cnpj: string): Promise<Empresa | null>;
}
