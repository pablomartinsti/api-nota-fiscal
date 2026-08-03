import { EmpresaNaoEncontradaError } from '../errors/EmpresaNaoEncontradaError';
import {
  AdminEmpresaOperacionalResumo,
  AdminOperacionalRepository,
} from '../repositories/AdminOperacionalRepository';

export class AtualizarEmissaoEmpresaAdminOperacionalService {
  constructor(
    private readonly adminOperacionalRepository: AdminOperacionalRepository,
  ) {}

  async executar(
    empresaId: string,
    emissaoHabilitada: boolean,
  ): Promise<AdminEmpresaOperacionalResumo> {
    const empresa =
      await this.adminOperacionalRepository.atualizarEmissaoEmpresa(
        empresaId,
        emissaoHabilitada,
      );

    if (!empresa) {
      throw new EmpresaNaoEncontradaError();
    }

    return empresa;
  }
}
