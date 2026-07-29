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
      certificadoA1Configurado: configuracao.possuiCertificadoA1(),
      certificadoA1ValidoAte: configuracao.certificadoA1ValidoAte,
      certificadoA1SenhaConfigurada: Boolean(
        configuracao.certificadoA1Senha,
      ),
      ativo: configuracao.ativo,
      createdAt: configuracao.createdAt,
      updatedAt: configuracao.updatedAt,
    };
  }
}
