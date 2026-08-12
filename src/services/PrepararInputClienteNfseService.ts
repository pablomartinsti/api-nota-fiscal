import { AmbienteFiscal } from '../entities/NotaServico';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
import { ConfiguracaoCertificadoClienteNfseInput } from '../fiscal/ClienteNfseNacional';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';

type ConfiguracaoCertificadoFiscal = {
  caminho?: string;
  conteudoBase64?: string;
  senha?: string;
};

export async function obterConfiguracaoCertificadoClienteNfse(
  resolverConfiguracaoFiscal:
    | ResolverConfiguracaoFiscalEmpresaService
    | undefined,
  empresaId: string,
  ambienteFiscal: AmbienteFiscal,
): Promise<ConfiguracaoCertificadoFiscal | undefined> {
  if (!resolverConfiguracaoFiscal) {
    if (ambienteFiscal === AmbienteFiscal.PRODUCAO) {
      throw new CertificadoA1EmpresaProducaoAusenteError();
    }

    return undefined;
  }

  return resolverConfiguracaoFiscal.obterCertificadoA1ParaAmbiente(
    empresaId,
    ambienteFiscal,
  );
}

export async function obterConfiguracaoCertificadoNotaServico(
  resolverConfiguracaoFiscal:
    | ResolverConfiguracaoFiscalEmpresaService
    | undefined,
  empresaId: string,
  ambienteFiscal?: AmbienteFiscal,
): Promise<ConfiguracaoCertificadoFiscal | undefined> {
  if (!ambienteFiscal) {
    return resolverConfiguracaoFiscal?.obterCertificadoA1(empresaId);
  }

  return obterConfiguracaoCertificadoClienteNfse(
    resolverConfiguracaoFiscal,
    empresaId,
    ambienteFiscal,
  );
}
export async function prepararInputClienteNfse<TInput extends object>(
  resolverConfiguracaoFiscal:
    | ResolverConfiguracaoFiscalEmpresaService
    | undefined,
  empresaId: string,
  ambienteFiscal: AmbienteFiscal,
  input: TInput,
): Promise<
  TInput &
    { ambienteFiscal: AmbienteFiscal } &
    ConfiguracaoCertificadoClienteNfseInput
> {
  const configuracaoCertificado =
    await obterConfiguracaoCertificadoClienteNfse(
      resolverConfiguracaoFiscal,
      empresaId,
      ambienteFiscal,
    );

  const inputBase = {
    ambienteFiscal,
    ...input,
  };

  if (!configuracaoCertificado) {
    return inputBase;
  }

  return {
    ...inputBase,
    certificadoPath: configuracaoCertificado.caminho,
    certificadoConteudoBase64: configuracaoCertificado.conteudoBase64,
    certificadoSenha: configuracaoCertificado.senha,
  };
}
