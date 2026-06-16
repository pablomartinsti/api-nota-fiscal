import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import forge from 'node-forge';
import { afterEach, describe, expect, it } from 'vitest';

import { XmlDpsInvalidoError } from '../errors/XmlDpsInvalidoError';
import { AssinadorXmlDpsXmlDsig } from './AssinadorXmlDpsXmlDsig';
import { ProvedorCertificadoA1Arquivo } from './ProvedorCertificadoA1Arquivo';
import { ValidadorXmlDpsXsd } from './ValidadorXmlDpsXsd';

const pastasTemporarias: string[] = [];

async function criarPfxTeste(cnpj: string): Promise<{
  caminho: string;
  senha: string;
}> {
  const pasta = await mkdtemp(join(tmpdir(), 'nfse-certificado-teste-'));
  const caminho = join(pasta, 'certificado-teste.pfx');
  const senha = 'senha-certificado-teste';
  const chaves = forge.pki.rsa.generateKeyPair(1024);
  const certificado = forge.pki.createCertificate();

  certificado.publicKey = chaves.publicKey;
  certificado.serialNumber = '01';
  certificado.validity.notBefore = new Date(Date.now() - 60_000);
  certificado.validity.notAfter = new Date(Date.now() + 86_400_000);
  certificado.setSubject([
    { name: 'commonName', value: 'Empresa Teste Ltda' },
    { name: 'serialNumber', value: cnpj },
  ]);
  certificado.setIssuer(certificado.subject.attributes);
  certificado.sign(chaves.privateKey, forge.md.sha256.create());

  const pfx = forge.pkcs12.toPkcs12Asn1(
    chaves.privateKey,
    certificado,
    senha,
    { algorithm: '3des' },
  );
  const bytes = forge.asn1.toDer(pfx).getBytes();

  await writeFile(caminho, Buffer.from(bytes, 'binary'));
  pastasTemporarias.push(pasta);

  return { caminho, senha };
}

describe('Seguranca do XML da DPS', () => {
  afterEach(async () => {
    await Promise.all(
      pastasTemporarias.splice(0).map((pasta) =>
        rm(pasta, { recursive: true, force: true }),
      ),
    );
  });

  it('deve carregar certificado A1 e gerar assinatura XMLDSig verificavel', async () => {
    const cnpj = '12345678000199';
    const configuracao = await criarPfxTeste(cnpj);
    const certificado = await new ProvedorCertificadoA1Arquivo(
      () => configuracao,
    ).obter();
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">',
      '  <infDPS Id="DPS350950221234567800019900001000000000000100">',
      '    <tpAmb>2</tpAmb>',
      '  </infDPS>',
      '</DPS>',
    ].join('\n');

    const xmlAssinado = new AssinadorXmlDpsXmlDsig().assinar(
      xml,
      certificado,
    );

    expect(certificado.cnpj).toBe(cnpj);
    expect(xmlAssinado).toContain(
      '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">',
    );
    expect(xmlAssinado).toContain(
      'URI="#DPS350950221234567800019900001000000000000100"',
    );
    expect(xmlAssinado).toContain('<X509Certificate>');
  });

  it('deve validar XML usando o XSD configurado', async () => {
    const pasta = await mkdtemp(join(tmpdir(), 'nfse-xsd-teste-'));
    const caminhoXsd = join(pasta, 'DPS_teste.xsd');
    const xsd = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">',
      '  <xs:element name="DPS">',
      '    <xs:complexType>',
      '      <xs:sequence>',
      '        <xs:element name="infDPS" type="xs:string"/>',
      '      </xs:sequence>',
      '    </xs:complexType>',
      '  </xs:element>',
      '</xs:schema>',
    ].join('\n');

    await writeFile(caminhoXsd, xsd);
    pastasTemporarias.push(pasta);

    const validador = new ValidadorXmlDpsXsd(() => caminhoXsd);

    await expect(
      validador.validar('<DPS><infDPS>valido</infDPS></DPS>'),
    ).resolves.toBeUndefined();
    await expect(
      validador.validar('<DPS><campoInvalido/></DPS>'),
    ).rejects.toBeInstanceOf(XmlDpsInvalidoError);
  });

  it('deve normalizar anchors de regex usados no XSD oficial', async () => {
    const pasta = await mkdtemp(join(tmpdir(), 'nfse-xsd-regex-teste-'));
    const caminhoXsd = join(pasta, 'DPS_teste.xsd');
    const xsd = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">',
      '  <xs:element name="DPS">',
      '    <xs:complexType>',
      '      <xs:sequence>',
      '        <xs:element name="serie">',
      '          <xs:simpleType>',
      '            <xs:restriction base="xs:string">',
      '              <xs:maxLength value="5"/>',
      '              <xs:pattern value="^0{0,4}\\d{1,5}$"/>',
      '            </xs:restriction>',
      '          </xs:simpleType>',
      '        </xs:element>',
      '      </xs:sequence>',
      '    </xs:complexType>',
      '  </xs:element>',
      '</xs:schema>',
    ].join('\n');

    await writeFile(caminhoXsd, xsd);
    pastasTemporarias.push(pasta);

    const validador = new ValidadorXmlDpsXsd(() => caminhoXsd);

    await expect(
      validador.validar('<DPS><serie>1</serie></DPS>'),
    ).resolves.toBeUndefined();
    await expect(
      validador.validar('<DPS><serie>ABC</serie></DPS>'),
    ).rejects.toBeInstanceOf(XmlDpsInvalidoError);
  });
});
