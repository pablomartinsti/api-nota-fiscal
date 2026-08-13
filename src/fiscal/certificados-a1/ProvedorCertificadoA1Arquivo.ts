import { readFile } from 'node:fs/promises';

import forge from 'node-forge';

import { CertificadoA1InvalidoError } from '../../errors/CertificadoA1InvalidoError';
import { ConfiguracaoFiscalAusenteError } from '../../errors/ConfiguracaoFiscalAusenteError';
import { CertificadoA1, ProvedorCertificadoA1 } from '../certificados-a1/CertificadoA1';

export interface ConfiguracaoCertificadoA1 {
  caminho?: string;
  conteudoBase64?: string;
  senha?: string;
}

export class ProvedorCertificadoA1Arquivo implements ProvedorCertificadoA1 {
  constructor(
    private readonly obterConfiguracao: () => ConfiguracaoCertificadoA1,
  ) {}

  async obter(): Promise<CertificadoA1> {
    const { caminho, conteudoBase64, senha } = this.obterConfiguracao();

    if ((!caminho && !conteudoBase64) || senha === undefined) {
      throw new ConfiguracaoFiscalAusenteError();
    }

    try {
      const arquivo = conteudoBase64
        ? this.decodificarBase64(conteudoBase64)
        : await readFile(caminho!);
      const asn1 = forge.asn1.fromDer(arquivo.toString('binary'));
      const pkcs12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, senha);
      const chave = this.buscarChavePrivada(pkcs12);
      const certificado = this.buscarCertificado(pkcs12);
      const agora = new Date();

      if (
        agora.getTime() < certificado.validity.notBefore.getTime() ||
        agora.getTime() > certificado.validity.notAfter.getTime()
      ) {
        throw new CertificadoA1InvalidoError(
          'Certificado A1 fora do periodo de validade.',
        );
      }

      const cnpj = this.extrairCnpj(certificado);

      if (!cnpj) {
        throw new CertificadoA1InvalidoError(
          'Nao foi possivel identificar o CNPJ do certificado A1.',
        );
      }

      return {
        chavePrivadaPem: forge.pki.privateKeyToPem(chave),
        certificadoPem: forge.pki.certificateToPem(certificado),
        cnpj,
        validoDe: certificado.validity.notBefore,
        validoAte: certificado.validity.notAfter,
      };
    } catch (error) {
      if (error instanceof CertificadoA1InvalidoError) {
        throw error;
      }

      throw new CertificadoA1InvalidoError();
    }
  }

  private decodificarBase64(conteudoBase64: string): Buffer {
    const conteudoNormalizado = conteudoBase64
      .replace(/^data:[^;]+;base64,/i, '')
      .replace(/\s/g, '');

    if (
      !conteudoNormalizado ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(conteudoNormalizado)
    ) {
      throw new CertificadoA1InvalidoError(
        'Conteudo do certificado A1 deve estar em Base64.',
      );
    }

    const buffer = Buffer.from(conteudoNormalizado, 'base64');
    const base64Reprocessado = buffer.toString('base64').replace(/=+$/, '');
    const base64Informado = conteudoNormalizado.replace(/=+$/, '');

    if (!buffer.length || base64Reprocessado !== base64Informado) {
      throw new CertificadoA1InvalidoError(
        'Conteudo do certificado A1 deve estar em Base64.',
      );
    }

    return buffer;
  }

  private buscarChavePrivada(pkcs12: forge.pkcs12.Pkcs12Pfx): forge.pki.PrivateKey {
    const tipos = [
      forge.pki.oids.pkcs8ShroudedKeyBag,
      forge.pki.oids.keyBag,
    ];

    for (const tipo of tipos) {
      const chave = pkcs12.getBags({ bagType: tipo })[tipo]?.[0]?.key;

      if (chave) {
        return chave;
      }
    }

    throw new CertificadoA1InvalidoError(
      'Chave privada nao encontrada no certificado A1.',
    );
  }

  private buscarCertificado(
    pkcs12: forge.pkcs12.Pkcs12Pfx,
  ): forge.pki.Certificate {
    const certificado =
      pkcs12.getBags({ bagType: forge.pki.oids.certBag })[
        forge.pki.oids.certBag
      ]?.[0]?.cert;

    if (!certificado) {
      throw new CertificadoA1InvalidoError(
        'Certificado publico nao encontrado no arquivo A1.',
      );
    }

    return certificado;
  }

  private extrairCnpj(certificado: forge.pki.Certificate): string | undefined {
    const cnpjDoNomeComum = this.extrairCnpjDoNomeComum(certificado);

    if (cnpjDoNomeComum) {
      return cnpjDoNomeComum;
    }

    const candidatos: string[] = certificado.subject.attributes.map(
      (atributo) => String(atributo.value),
    );
    const extensao = certificado.getExtension('subjectAltName');

    if (extensao && 'altNames' in extensao && Array.isArray(extensao.altNames)) {
      for (const nome of extensao.altNames) {
        if (typeof nome.value === 'string') {
          candidatos.push(nome.value);
          candidatos.push(this.decodificarAsn1(nome.value));
        }
      }
    }

    for (const candidato of candidatos) {
      const numeros = candidato.replace(/\D/g, '');
      const correspondencia = numeros.match(/\d{14}/);

      if (correspondencia) {
        return correspondencia[0];
      }
    }

    return undefined;
  }

  private extrairCnpjDoNomeComum(
    certificado: forge.pki.Certificate,
  ): string | undefined {
    const nomesComuns = certificado.subject.attributes
      .filter((atributo) => atributo.name === 'commonName')
      .map((atributo) => String(atributo.value));

    for (const nomeComum of nomesComuns) {
      const correspondencia = nomeComum.match(/:(\d{14})(?:\D|$)/);

      if (correspondencia) {
        return correspondencia[1];
      }
    }

    return undefined;
  }

  private decodificarAsn1(valor: string): string {
    try {
      const asn1 = forge.asn1.fromDer(valor);
      const textos: string[] = [];
      this.coletarTextosAsn1(asn1, textos);
      return textos.join(' ');
    } catch {
      return '';
    }
  }

  private coletarTextosAsn1(no: forge.asn1.Asn1, textos: string[]): void {
    if (typeof no.value === 'string') {
      textos.push(no.value);
      return;
    }

    for (const filho of no.value) {
      this.coletarTextosAsn1(filho, textos);
    }
  }
}
