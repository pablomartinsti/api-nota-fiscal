# Homologacao em Producao Restrita

Este guia prepara o primeiro teste manual com a NFS-e Nacional em Producao
Restrita. Ele nao substitui a documentacao oficial da SEFIN Nacional.

## 1. Antes de comecar

Confira estes itens:

- Certificado A1 `.pfx` disponivel localmente.
- Senha do certificado A1.
- CNPJ da empresa cadastrada igual ao CNPJ do certificado.
- XSD oficial da DPS baixado.
- PostgreSQL rodando.
- Migrations aplicadas.
- API rodando localmente.
- Usuario autenticavel criado.

Nunca salve certificado real, senha ou `.env` no Git.

## 2. Variaveis obrigatorias

Configure no `.env`:

```env
NFSE_CERTIFICADO_PATH="C:\caminho\certificados\empresa.pfx"
NFSE_CERTIFICADO_SENHA="senha-do-certificado"
NFSE_XSD_DPS_PATH="C:\caminho\nfse-xsd\Schemas\1.01\DPS_v1.01.xsd"
NFSE_SEFIN_BASE_URL="https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional"
NFSE_SEFIN_ENVIO_DPS_PATH="/DPS"
NFSE_SEFIN_TIMEOUT_MS=15000
```

O `NFSE_SEFIN_ENVIO_DPS_PATH` deve ser confirmado no Swagger oficial da SEFIN
Nacional antes do primeiro envio real.

## 3. Checagem local

Antes de enviar qualquer DPS, rode:

```bash
npm run nfse:check-homologacao
```

Esse comando valida somente configuracao local:

- existencia do certificado A1;
- existencia do XSD da DPS;
- leitura do certificado;
- validade do certificado;
- CNPJ encontrado no certificado;
- formato da URL da SEFIN;
- protecao basica do `.gitignore`.

Ele nao envia XML para a SEFIN.

## 4. Dados minimos para homologacao

### Empresa

A empresa autenticada precisa ter:

- CNPJ igual ao certificado A1;
- razao social;
- regime tributario;
- codigo IBGE do municipio;
- cidade;
- UF;
- inscricao municipal, quando exigida pelo municipio.

### Cliente

O tomador precisa ter:

- CPF ou CNPJ valido para o ambiente de teste;
- nome ou razao social;
- cidade;
- UF;
- codigo IBGE do municipio, quando exigido.

### Servico

O servico precisa ter:

- descricao;
- codigo do servico interno;
- codigo de tributacao nacional;
- aliquota de ISS.

### NotaServico

A nota precisa estar em `RASCUNHO` e conter:

- cliente;
- servico;
- valor do servico;
- descricao;
- serie da DPS;
- numero da DPS;
- data de competencia;
- codigo IBGE do municipio de prestacao.

## 5. Ordem recomendada do teste

1. Configure o `.env`.
2. Rode `npm run nfse:check-homologacao`.
3. Suba o banco com Docker.
4. Rode as migrations.
5. Suba a API.
6. Crie ou atualize a empresa com o CNPJ do certificado.
7. Crie cliente e servico de teste.
8. Crie a NotaServico em rascunho.
9. Consulte a prontidao fiscal:

```http
GET /notas-servico/:notaId/prontidao-fiscal
```

10. Gere o XML assinado para conferencia:

```http
GET /notas-servico/:notaId/xml-dps-assinado
```

11. Envie a DPS assinada:

```http
POST /notas-servico/:notaId/enviar-dps
```

## 6. Como interpretar o resultado

Se a resposta vier como `EMITIDA`, confira:

- `numeroNfse`;
- `codigoVerificacao`;
- `protocoloEmissao`;
- `chaveAcesso`;
- `dataAutorizacao`;
- `xmlAutorizado`.

Se a resposta vier como `ERRO`, confira:

- `mensagemErroFiscal`;
- dados fiscais da empresa;
- dados fiscais do servico;
- campos da DPS;
- endpoint da SEFIN.

## 7. Cuidados

- Nao use certificado real em testes automatizados.
- Nao envie dados de producao em Producao Restrita.
- Nao versionar `.env`, `.pfx`, `.p12` ou pasta `certificados/`.
- Confirme o endpoint no Swagger oficial antes de considerar a homologacao
  valida.
- Guarde evidencias do retorno da SEFIN sem expor senha ou certificado.
