import 'dotenv/config';

import { access, readFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { env } from '../config/env';
import { ProvedorCertificadoA1Arquivo } from '../fiscal/ProvedorCertificadoA1Arquivo';

interface ResultadoCheck {
  nome: string;
  sucesso: boolean;
  detalhe?: string;
}

async function main(): Promise<void> {
  const resultados: ResultadoCheck[] = [];
  const sefinHomologacaoBaseUrl =
    env.NFSE_SEFIN_HOMOLOGACAO_BASE_URL ?? env.NFSE_SEFIN_BASE_URL;

  resultados.push(await verificarArquivo('Certificado A1', env.NFSE_CERTIFICADO_PATH));
  resultados.push(await verificarArquivo('XSD da DPS', env.NFSE_XSD_DPS_PATH));
  resultados.push(
    await verificarArquivo('XSD do pedido de evento', env.NFSE_XSD_EVENTO_PATH),
  );
  resultados.push(verificarValor('Senha do certificado', env.NFSE_CERTIFICADO_SENHA));
  resultados.push(verificarValor('URL base da SEFIN em homologacao', sefinHomologacaoBaseUrl));
  resultados.push(
    verificarValor('Endpoint de envio da DPS', env.NFSE_SEFIN_ENVIO_DPS_PATH),
  );
  resultados.push(verificarUrlSefin(sefinHomologacaoBaseUrl));
  resultados.push(verificarEndpointEnvio(env.NFSE_SEFIN_ENVIO_DPS_PATH));
  resultados.push(await verificarGitignore());
  resultados.push(await verificarCertificado());

  for (const resultado of resultados) {
    const marcador = resultado.sucesso ? 'OK' : 'ERRO';
    const detalhe = resultado.detalhe ? ` - ${resultado.detalhe}` : '';
    console.log(`[${marcador}] ${resultado.nome}${detalhe}`);
  }

  if (resultados.some((resultado) => !resultado.sucesso)) {
    process.exitCode = 1;
    return;
  }

  console.log('Homologacao local pronta para teste manual. Nenhum envio foi feito.');
}

async function verificarArquivo(
  nome: string,
  caminho: string | undefined,
): Promise<ResultadoCheck> {
  if (!caminho) {
    return { nome, sucesso: false, detalhe: 'variavel nao configurada' };
  }

  try {
    await access(caminho);
    return { nome, sucesso: true, detalhe: basename(caminho) };
  } catch {
    return { nome, sucesso: false, detalhe: 'arquivo nao encontrado' };
  }
}

function verificarValor(nome: string, valor: string | undefined): ResultadoCheck {
  return valor
    ? { nome, sucesso: true }
    : { nome, sucesso: false, detalhe: 'variavel nao configurada' };
}

function verificarUrlSefin(baseUrl: string | undefined): ResultadoCheck {
  if (!baseUrl) {
    return { nome: 'Formato da URL da SEFIN', sucesso: false };
  }

  try {
    const url = new URL(baseUrl);

    return {
      nome: 'Formato da URL da SEFIN',
      sucesso: url.protocol === 'https:',
      detalhe: url.protocol === 'https:' ? url.host : 'use HTTPS',
    };
  } catch {
    return {
      nome: 'Formato da URL da SEFIN',
      sucesso: false,
      detalhe: 'URL invalida',
    };
  }
}

function verificarEndpointEnvio(endpoint: string | undefined): ResultadoCheck {
  if (!endpoint) {
    return { nome: 'Endpoint oficial de envio', sucesso: false };
  }

  const endpointNormalizado = endpoint.trim().toLowerCase();
  const sucesso =
    endpointNormalizado === '/nfse' || endpointNormalizado === 'nfse';

  return {
    nome: 'Endpoint oficial de envio',
    sucesso,
    detalhe: sucesso ? '/nfse' : 'esperado /nfse conforme Swagger da SEFIN',
  };
}

async function verificarGitignore(): Promise<ResultadoCheck> {
  try {
    const gitignore = await readFile('.gitignore', 'utf8');
    const protegeCertificados =
      gitignore.includes('*.pfx') &&
      gitignore.includes('*.p12') &&
      gitignore.includes('certificados/');

    return {
      nome: 'Protecao de certificados no .gitignore',
      sucesso: protegeCertificados,
    };
  } catch {
    return {
      nome: 'Protecao de certificados no .gitignore',
      sucesso: false,
      detalhe: '.gitignore nao encontrado',
    };
  }
}

async function verificarCertificado(): Promise<ResultadoCheck> {
  if (!env.NFSE_CERTIFICADO_PATH || env.NFSE_CERTIFICADO_SENHA === undefined) {
    return {
      nome: 'Leitura do certificado A1',
      sucesso: false,
      detalhe: 'configuracao incompleta',
    };
  }

  try {
    const certificado = await new ProvedorCertificadoA1Arquivo(() => ({
      caminho: env.NFSE_CERTIFICADO_PATH,
      senha: env.NFSE_CERTIFICADO_SENHA,
    })).obter();

    return {
      nome: 'Leitura do certificado A1',
      sucesso: true,
      detalhe: `CNPJ ${certificado.cnpj}, valido ate ${certificado.validoAte.toISOString().slice(0, 10)}`,
    };
  } catch {
    return {
      nome: 'Leitura do certificado A1',
      sucesso: false,
      detalhe: 'nao foi possivel abrir ou validar o certificado',
    };
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Erro inesperado.');
  process.exitCode = 1;
});
