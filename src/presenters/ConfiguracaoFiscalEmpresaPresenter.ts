import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';

export class ConfiguracaoFiscalEmpresaPresenter {
  static paraHttp(
    configuracao: ConfiguracaoFiscalEmpresa,
    configurada = true,
  ) {
    return {
      id: configuracao.id,
      empresaId: configuracao.empresaId,
      configurada,
      ambienteFiscalPadrao: configuracao.ambienteFiscalPadrao,
      serieDpsPadrao: configuracao.serieDpsPadrao,
      certificadoA1Path: configuracao.certificadoA1Path,
      certificadoA1SenhaConfigurada: Boolean(
        configuracao.certificadoA1Senha,
      ),
      ativo: configuracao.ativo,
      createdAt: configuracao.createdAt,
      updatedAt: configuracao.updatedAt,
    };
  }
}
