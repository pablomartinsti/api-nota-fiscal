import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';

export interface ConfiguracaoFiscalEmpresaRepository {
  salvar(
    configuracao: ConfiguracaoFiscalEmpresa,
  ): Promise<ConfiguracaoFiscalEmpresa>;

  buscarPorEmpresaId(
    empresaId: string,
  ): Promise<ConfiguracaoFiscalEmpresa | null>;
}
