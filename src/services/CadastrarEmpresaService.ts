import { Empresa, RegimeTributario } from '../entities/Empresa';
import { EmpresaRepository } from '../repositories/EmpresaRepository';

export interface CadastrarEmpresaInput {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoMunicipal?: string;
  regimeTributario: RegimeTributario;
  cidade: string;
  uf: string;
}

export class CadastrarEmpresaService {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async executar(input: CadastrarEmpresaInput): Promise<Empresa> {
    const empresa = new Empresa(input);
    const empresaExistente = await this.empresaRepository.buscarPorCnpj(
      empresa.cnpj,
    );

    if (empresaExistente) {
      throw new Error('Já existe uma empresa cadastrada com este CNPJ.');
    }

    return this.empresaRepository.salvar(empresa);
  }
}
