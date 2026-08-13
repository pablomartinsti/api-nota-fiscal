import { EmpresaNaoEncontradaError } from '../../errors/EmpresaNaoEncontradaError';
import {
  AdminEmpresaOperacionalResumo,
  AdminOperacionalRepository,
  AtualizarConfiguracaoFiscalEmpresaAdminInput,
} from '../../repositories/AdminOperacionalRepository';

export class AtualizarConfiguracaoFiscalEmpresaAdminOperacionalService {
  constructor(
    private readonly adminOperacionalRepository: AdminOperacionalRepository,
  ) {}

  async executar(
    empresaId: string,
    dados: AtualizarConfiguracaoFiscalEmpresaAdminInput,
  ): Promise<AdminEmpresaOperacionalResumo> {
    const empresa =
      await this.adminOperacionalRepository.atualizarConfiguracaoFiscalEmpresa(
        empresaId,
        dados,
      );

    if (!empresa) {
      throw new EmpresaNaoEncontradaError();
    }

    return empresa;
  }
}
