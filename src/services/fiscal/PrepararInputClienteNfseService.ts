import { AmbienteFiscal } from '../../entities/NotaServico';
import { CertificadoA1EmpresaProducaoAusenteError } from '../../errors/CertificadoA1EmpresaProducaoAusenteError';
import { ConfiguracaoFiscalAusenteError } from '../../errors/ConfiguracaoFiscalAusenteError';
import {
  CertificadoA1,
  ProvedorCertificadoA1,
} from '../../fiscal/certificados-a1/CertificadoA1';
import { ProvedorCertificadoA1Arquivo } from '../../fiscal/certificados-a1/ProvedorCertificadoA1Arquivo';
import { ConfiguracaoCertificadoClienteNfseInput } from '../../fiscal/clientes/ClienteNfseNacional';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';

type ConfiguracaoCertificadoFiscal = {
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

export async function obterCertificadoA1Fiscal(input: {
  resolverConfiguracaoFiscal?: ResolverConfiguracaoFiscalEmpresaService;
  provedorCertificado?: ProvedorCertificadoA1;
  empresaId: string;
  ambienteFiscal?: AmbienteFiscal;
}): Promise<CertificadoA1> {
  const configuracaoCertificado =
    await obterConfiguracaoCertificadoNotaServico(
      input.resolverConfiguracaoFiscal,
      input.empresaId,
      input.ambienteFiscal,
    );

  if (!configuracaoCertificado) {
    if (input.provedorCertificado) {
      return input.provedorCertificado.obter();
    }

    throw new ConfiguracaoFiscalAusenteError();
  }

  return new ProvedorCertificadoA1Arquivo(() => ({
    conteudoBase64: configuracaoCertificado.conteudoBase64,
    senha: configuracaoCertificado.senha,
  })).obter();
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
    certificadoConteudoBase64: configuracaoCertificado.conteudoBase64,
    certificadoSenha: configuracaoCertificado.senha,
  };
}
