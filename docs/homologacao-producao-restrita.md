# Homologacao em Producao Restrita

Este guia prepara o primeiro teste manual com a NFS-e Nacional em Producao
Restrita. Ele nao substitui a documentacao oficial da SEFIN Nacional.

Documentacao oficial consultada:

- Portal gov.br de APIs da NFS-e:
  `https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao`
- Documentacao da SEFIN Nacional em Producao Restrita:
  `https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/docs/index`

A pagina da documentacao acima carrega o OpenAPI em
`https://sefin.producaorestrita.nfse.gov.br/SefinNacional/swagger/docs/v1`.
O Swagger oficial informa `basePath` `/SefinNacional` e recepcao sincrona em
`POST /nfse`.

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
NFSE_XSD_EVENTO_PATH="C:\caminho\nfse-xsd\Schemas\1.01\pedRegEvento_v1.01.xsd"
NFSE_SEFIN_BASE_URL="https://sefin.producaorestrita.nfse.gov.br/SefinNacional"
NFSE_SEFIN_ENVIO_DPS_PATH="/nfse"
NFSE_SEFIN_TIMEOUT_MS=15000
```

A documentacao oficial da SEFIN Nacional abre pelo caminho com `/API`, mas os
recursos carregados por ela apontam para `/SefinNacional`. Por isso:

- `NFSE_SEFIN_BASE_URL` deve ser `https://sefin.producaorestrita.nfse.gov.br/SefinNacional`;
- `NFSE_SEFIN_ENVIO_DPS_PATH` deve ser `/nfse`;
- o body enviado para a SEFIN deve ser JSON no formato
  `{ "dpsXmlGZipB64": "..." }`, com a DPS assinada compactada em GZip e
  codificada em Base64.
- o mesmo certificado A1 configurado em `NFSE_CERTIFICADO_PATH` e
  `NFSE_CERTIFICADO_SENHA` tambem e apresentado na conexao HTTPS com
  autenticacao mutua TLS.

## 3. Checagem local

Antes de enviar qualquer DPS, rode:

```bash
npm run nfse:check-homologacao
```

Esse comando valida somente configuracao local:

- existencia do certificado A1;
- existencia do XSD da DPS;
- existencia do XSD do pedido de evento;
- leitura do certificado;
- validade do certificado;
- CNPJ encontrado no certificado;
- formato da URL da SEFIN;
- protecao basica do `.gitignore`.

Ele nao envia XML para a SEFIN.

## 4. Ultima conferencia antes do envio

Antes de chamar a rota que envia para a SEFIN, confira manualmente:

- o `.env` aponta para Producao Restrita, nao para Producao;
- o certificado A1 e o mesmo CNPJ da empresa prestadora;
- o certificado nao esta vencido;
- o XML assinado foi gerado sem erro;
- o cliente/tomador usado e de teste;
- a nota continua em `RASCUNHO`;
- `GET /notas-servico/:notaId/prontidao-fiscal` retorna a nota pronta;
- voce esta ciente de que `POST /notas-servico/:notaId/enviar-dps` faz envio
  real para a SEFIN Nacional.

Se qualquer item acima estiver incerto, pare e corrija antes do envio.

## 5. Dados minimos para homologacao

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

## 6. Ordem recomendada do teste

1. Configure o `.env`.
2. Rode `npm run nfse:check-homologacao`.
3. Abra a documentacao oficial da SEFIN Nacional em Producao Restrita, se
   quiser revisar o contrato oficial.
4. Suba o banco com Docker.
5. Rode as migrations.
6. Suba a API.
7. Crie ou atualize a empresa com o CNPJ do certificado.
8. Crie cliente e servico de teste.
9. Crie a NotaServico em rascunho.
10. Consulte a prontidao fiscal:

```http
GET /notas-servico/:notaId/prontidao-fiscal
```

Se essa rota retornar pendencias, nao envie a DPS ainda.

11. Gere o XML assinado para conferencia:

```http
GET /notas-servico/:notaId/xml-dps-assinado
```

12. Faca a ultima conferencia da secao 4.
13. Envie a DPS assinada:

```http
POST /notas-servico/:notaId/enviar-dps
```

Exemplo com `curl`:

```bash
curl -X POST "http://localhost:3333/notas-servico/NOTA_ID/enviar-dps" \
  -H "Authorization: Bearer SEU_TOKEN"
```

Nao cole certificado, senha, `.env` ou XML real em issue, chat ou commit.

## 7. Como interpretar o resultado

Se a resposta vier como `EMITIDA`, confira:

- `numeroNfse`;
- `protocoloEmissao`;
- `chaveAcesso`;
- `dataAutorizacao`;
- `xmlAutorizado`.

Guarde como evidencia apenas dados nao sensiveis, como status HTTP interno,
`chaveAcesso`, horario do teste e mensagem de retorno. Evite salvar XML real em
repositorio.

Se a resposta vier como `ERRO`, confira:

- `mensagemErroFiscal`;
- dados fiscais da empresa;
- dados fiscais do servico;
- campos da DPS;
- endpoint da SEFIN.

Erros comuns:

- `Configuracao fiscal para assinatura da DPS nao foi informada.`: falta
  certificado, senha ou XSD no `.env`.
- `Configuracao da SEFIN Nacional nao foi informada.`: URL base ou endpoint da
  SEFIN esta ausente ou invalido.
- `Nao foi possivel comunicar com a SEFIN Nacional.`: falha de rede, TLS,
  certificado recusado ou indisponibilidade externa.
- `Tempo limite excedido ao comunicar com a SEFIN Nacional.`: aumente
  `NFSE_SEFIN_TIMEOUT_MS` ou tente novamente depois.
- resposta fiscal com `mensagemErroFiscal`: a SEFIN processou a requisicao e
  recusou por regra fiscal, dados da DPS, prestador, tomador ou servico.

## 8. Depois do primeiro envio

Se a nota for emitida:

1. copie a `chaveAcesso` para controle local;
2. confira se `xmlAutorizado` foi persistido;
3. consulte a NFS-e emitida na SEFIN Nacional:

```http
GET /notas-servico/:notaId/consulta-nfse
```

Exemplo com `curl`:

```bash
curl "http://localhost:3333/notas-servico/NOTA_ID/consulta-nfse" \
  -H "Authorization: Bearer SEU_TOKEN"
```

4. mantenha a nota como evidencia de homologacao;
5. nao use a rota simulada `POST /notas-servico/:notaId/emitir` para essa nota.

Para cancelar uma NFS-e emitida na SEFIN Nacional:

```http
POST /notas-servico/:notaId/cancelar-nfse
```

Body:

```json
{
  "codigoMotivo": "1",
  "motivo": "Erro na emissao em ambiente de homologacao"
}
```

Codigos de motivo aceitos pelo layout:

- `1`: erro na emissao;
- `2`: servico nao prestado;
- `9`: outros.

O sistema so muda a nota para `CANCELADA` quando a SEFIN aceita o evento.

Se a nota ficar com erro:

1. leia `mensagemErroFiscal`;
2. corrija empresa, cliente, servico ou nota;
3. use a rota de retorno para rascunho apenas se fizer sentido no fluxo;
4. gere novamente o XML assinado antes de reenviar.

## 9. Cuidados

- Nao use certificado real em testes automatizados.
- Nao envie dados de producao em Producao Restrita.
- Nao versionar `.env`, `.pfx`, `.p12` ou pasta `certificados/`.
- O envio real deve ser manual e intencional.
- Guarde evidencias do retorno da SEFIN sem expor senha ou certificado.
