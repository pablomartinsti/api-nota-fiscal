# API de Emissao de NFS-e

API SaaS multiempresa para gestao e futura emissao de Notas Fiscais de
Servico Eletronicas (NFS-e).

O projeto possui autenticacao, isolamento de dados por empresa e gestao de
usuarios, clientes, servicos e notas. A comunicacao com a NFS-e Nacional ainda
nao foi integrada: emissao e cancelamento utilizam um emissor simulado.

## Tecnologias

- Node.js
- TypeScript
- Express
- Prisma ORM
- PostgreSQL
- Docker
- JWT
- Zod
- Vitest e Supertest

## Funcionalidades implementadas

- Onboarding atomico de empresa e usuario proprietario
- Autenticacao JWT e alteracao de senha
- Perfis `DONO`, `ADMIN` e `OPERADOR`
- Isolamento multiempresa
- Gestao da empresa autenticada
- Gestao de usuarios, clientes e servicos
- Criacao e atualizacao de notas em rascunho
- Calculo de ISS
- Ciclo simulado de emissao, erro, retorno para rascunho e cancelamento
- Health check, readiness check e resposta JSON para rotas inexistentes
- Testes unitarios e testes de integracao HTTP

## Arquitetura

```text
Route
  -> Controller
    -> Service
      -> Repository
        -> Prisma
          -> PostgreSQL
```

As entidades concentram regras de dominio. Os services coordenam casos de uso,
e os repositories isolam a persistencia. O contrato `EmissorNotaServico`
permite substituir o emissor simulado por uma integracao fiscal real no futuro.

## Requisitos

- Node.js
- Docker e Docker Compose
- npm

## Configuracao

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env` a partir de `.env.example` e configure:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/banco"
JWT_SECRET="substitua-por-uma-chave-secreta-forte"
PORT=3333
CORS_ORIGIN="http://localhost:3000"
NODE_ENV="development"
```

Use `CORS_ORIGIN="*"` para liberar todas as origens durante desenvolvimento.
Mais de uma origem pode ser informada separando os enderecos por virgula.

3. Inicie o PostgreSQL:

```bash
docker compose up -d
```

4. Gere o Prisma Client e execute as migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Inicie a API:

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm test
npm run test:integration
npm run nfse:check-homologacao
npm run config:check-production
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## Rotas principais

### Operacao

- `GET /health`: verifica se o processo da API esta ativo
- `GET /ready`: verifica se a API consegue acessar o PostgreSQL

### Acesso e conta

- `POST /onboarding`
- `POST /sessoes`
- `GET /me`
- `PUT /me`
- `PUT /me/senha`

### Empresa e usuarios

- `GET /empresa`
- `PUT /empresa`
- `GET /empresa/configuracao-fiscal`
- `PUT /empresa/configuracao-fiscal`
- `POST /empresa/configuracao-fiscal/certificado-a1`
- `POST /usuarios`
- `GET /usuarios`
- `PATCH /usuarios/:usuarioId/perfil`
- `PATCH /usuarios/:usuarioId/status`

### Clientes e servicos

- `POST /clientes`
- `GET /clientes`
- `GET /clientes/:clienteId`
- `PUT /clientes/:clienteId`
- `PATCH /clientes/:clienteId/status`
- `POST /servicos`
- `GET /servicos`
- `GET /servicos/:servicoId`
- `PUT /servicos/:servicoId`
- `PATCH /servicos/:servicoId/status`

### Notas de servico

- `POST /notas-servico`
- `GET /notas-servico`
- `GET /notas-servico/:notaId`
- `GET /notas-servico/:notaId/prontidao-fiscal`
- `GET /notas-servico/:notaId/xml-dps`
- `GET /notas-servico/:notaId/xml-dps-assinado`
- `POST /notas-servico/:notaId/enviar-dps`
- `GET /notas-servico/:notaId/consulta-nfse`
- `GET /notas-servico/:notaId/eventos-fiscais`
- `POST /notas-servico/:notaId/reconciliar-envio`
- `POST /notas-servico/:notaId/cancelar-nfse`
- `POST /notas-servico/:notaId/substituir`
- `PUT /notas-servico/:notaId`
- `POST /notas-servico/:notaId/emitir`
- `POST /notas-servico/:notaId/retornar-rascunho`
- `POST /notas-servico/:notaId/cancelar`

Exceto onboarding, login e rotas operacionais, as rotas exigem o cabecalho:

```text
Authorization: Bearer <token>
```

## Estado da integracao fiscal

A API gera o XML basico nao assinado da DPS Nacional para notas fiscalmente
prontas e pode validar e assinar esse XML usando um certificado A1 configurado
por variaveis de ambiente.

Tambem existe um cliente HTTP inicial para comunicacao com a SEFIN Nacional em
Producao Restrita e uma rota para enviar a DPS assinada. O Swagger oficial da
SEFIN Nacional informa `basePath` `/SefinNacional` e envio sincrono em
`POST /nfse`, recebendo JSON com o campo `dpsXmlGZipB64`. Por isso, a
URL configurada deve ficar sem `/API`. A API separa a URL da SEFIN por
ambiente fiscal: `NFSE_SEFIN_HOMOLOGACAO_BASE_URL` para Producao Restrita e
`NFSE_SEFIN_PRODUCAO_BASE_URL` para producao real. A variavel antiga
`NFSE_SEFIN_BASE_URL` continua aceita apenas como fallback temporario de
homologacao. O endpoint interno `POST /notas-servico/:notaId/enviar-dps`
registra sucesso ou erro fiscal na NotaServico conforme o retorno recebido.
Antes da chamada externa, a nota sai de `RASCUNHO` para `PROCESSANDO`, evitando
novo envio concorrente da mesma DPS. Em caso de rejeicao fiscal, retorno
inconsistente ou falha de comunicacao, a nota fica como `ERRO` com mensagem
rastreavel; para reenviar, e necessario retornar manualmente para rascunho. Se
houver duvida se a SEFIN autorizou a NFS-e apesar de um timeout ou erro de
comunicacao local, a rota
`POST /notas-servico/:notaId/reconciliar-envio` consulta a SEFIN pela
`chaveAcesso` e atualiza a nota para `EMITIDA` quando a NFS-e existir. A rota
`GET /notas-servico/:notaId/eventos-fiscais` lista a trilha de auditoria
fiscal da nota, com tipo do evento, sucesso/erro, status HTTP, chave de acesso
e mensagem resumida. Esse historico nao armazena certificado, senha ou XML
completo. A rota
`POST /notas-servico/:notaId/cancelar-nfse` registra o evento oficial de
cancelamento e so muda a nota para `CANCELADA` se a SEFIN aceitar. A rota
`POST /notas-servico/:notaId/substituir` cria um novo rascunho com vinculo para
a NFS-e substituida; depois esse rascunho usa o envio fiscal normal. Quando a
SEFIN aceita a DPS substituidora, a nota original passa para `SUBSTITUIDA` no
sistema. A rota antiga `POST /notas-servico/:notaId/emitir` ainda usa o emissor
simulado.

Quando `numeroDps` nao e informado ao criar um rascunho, a API gera o proximo
numero automaticamente por empresa, ambiente fiscal e serie da DPS. Informar
`numeroDps` manualmente continua permitido para testes controlados.

Variaveis fiscais:

```env
NFSE_CERTIFICADO_PATH=""
NFSE_CERTIFICADO_SENHA=""
NFSE_CERTIFICADO_CRYPTO_KEY=""
NFSE_CERTIFICADO_STORAGE_DIR="storage/certificados"
NFSE_XSD_DPS_PATH=""
NFSE_XSD_EVENTO_PATH=""
NFSE_SEFIN_HOMOLOGACAO_BASE_URL="https://sefin.producaorestrita.nfse.gov.br/SefinNacional"
NFSE_SEFIN_PRODUCAO_BASE_URL=""
NFSE_SEFIN_BASE_URL=""
NFSE_SEFIN_ENVIO_DPS_PATH="/nfse"
NFSE_SEFIN_TIMEOUT_MS=15000
NFSE_PERMITIR_PRODUCAO_REAL="false"
```

Gere `NFSE_CERTIFICADO_CRYPTO_KEY` com 32 bytes em Base64:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

O modelo `ConfiguracaoFiscalEmpresa` ja existe para preparar o SaaS
multiempresa, guardando ambiente fiscal padrao, serie padrao da DPS e
referencias do certificado A1 por empresa. O fluxo fiscal ja consulta essa
configuracao ao criar rascunhos, assinar XML, enviar DPS, consultar NFS-e e
cancelar NFS-e. Quando a empresa ainda nao tiver configuracao ativa ou
certificado completo configurado, a API usa temporariamente as variaveis globais
do `.env` como fallback apenas em `HOMOLOGACAO`.

Para preparar producao real, prefira configurar o certificado A1 pela rota de
upload em Base64. A API salva o arquivo em `NFSE_CERTIFICADO_STORAGE_DIR`,
valida senha, validade e CNPJ do certificado contra a empresa autenticada, e
grava a senha criptografada no banco. A resposta nunca retorna senha nem
conteudo do certificado.

Exemplo para configurar o certificado A1 da empresa autenticada:

```json
{
  "certificadoA1NomeArquivo": "empresa.pfx",
  "certificadoA1Base64": "BASE64_DO_ARQUIVO_PFX",
  "certificadoA1Senha": "senha-do-certificado"
}
```

Exemplo para atualizar a configuracao fiscal da empresa autenticada:

```json
{
  "ambienteFiscalPadrao": "HOMOLOGACAO",
  "serieDpsPadrao": "1",
  "certificadoA1Path": "C:/caminho/certificados/empresa.pfx",
  "certificadoA1Senha": "senha-do-certificado"
}
```

A resposta nunca retorna `certificadoA1Senha`; ela informa apenas
`certificadoA1SenhaConfigurada`. A configuracao manual por
`certificadoA1Path` e `certificadoA1Senha` continua disponivel para
desenvolvimento/homologacao local, mas para producao real o fluxo recomendado e
o upload controlado pela API.

Por seguranca, operacoes fiscais em `PRODUCAO` ficam bloqueadas por padrao.
Enviar DPS, consultar NFS-e, cancelar NFS-e e criar substituicao em producao
real so sao permitidos quando `NFSE_PERMITIR_PRODUCAO_REAL="true"` estiver
configurado. Em `HOMOLOGACAO`, o fluxo continua funcionando normalmente.

As rotas simuladas `POST /notas-servico/:notaId/emitir` e
`POST /notas-servico/:notaId/cancelar` existem apenas para desenvolvimento e
testes locais. Em `NODE_ENV="production"`, elas ficam bloqueadas. Para uso
fiscal real, use `POST /notas-servico/:notaId/enviar-dps` e
`POST /notas-servico/:notaId/cancelar-nfse`.

Mesmo com `NFSE_PERMITIR_PRODUCAO_REAL="true"`, uma nota em `PRODUCAO` exige
certificado A1 configurado na propria empresa. O sistema nao usa o certificado
global do `.env` como fallback em producao real.

Em `NODE_ENV="production"`, a API valida configuracoes minimas de seguranca
antes de subir:

- `JWT_SECRET` deve ser forte e ter pelo menos 32 caracteres
- `CORS_ORIGIN` nao pode permitir `*`
- `NFSE_CERTIFICADO_CRYPTO_KEY` deve ser uma chave valida de 32 bytes
- quando `NFSE_PERMITIR_PRODUCAO_REAL="true"`,
  `NFSE_SEFIN_PRODUCAO_BASE_URL` nao pode apontar para Producao Restrita e os
  XSDs de DPS/evento precisam estar configurados

Para simular essa validacao localmente antes de publicar:

```bash
npm run config:check-production
```

Antes de enviar a primeira DPS em producao real, use a rota de prontidao da
nota:

```http
GET /notas-servico/:notaId/prontidao-fiscal
```

Para notas em `HOMOLOGACAO`, ela confere somente os dados fiscais minimos da
DPS. Para notas em `PRODUCAO`, a resposta tambem inclui o bloco
`producaoReal`, conferindo:

- `NFSE_PERMITIR_PRODUCAO_REAL`
- URL oficial de producao da SEFIN
- XSD da DPS
- XSD de evento
- certificado A1 configurado na propria empresa

Exemplo de pendencias para uma nota de producao ainda bloqueada:

```json
{
  "pronto": false,
  "pendencias": [
    "producaoReal.permissao",
    "empresa.configuracaoFiscal.certificadoA1"
  ],
  "producaoReal": {
    "habilitada": false,
    "urlSefinProducaoConfigurada": true,
    "xsdDpsConfigurado": true,
    "xsdEventoConfigurado": true,
    "certificadoA1EmpresaConfigurado": false
  }
}
```

Quando essa rota retornar `pronto: true` para uma nota em `PRODUCAO`, a API
estara pronta para uma tentativa manual de envio real pela rota
`POST /notas-servico/:notaId/enviar-dps`.

Antes da emissao real completa em clientes de outros regimes, ainda sera
necessario validar as regras fiscais especificas de cada regime tributario.

Para preparar o primeiro teste em Producao Restrita, consulte:

- [Guia de homologacao em Producao Restrita](docs/homologacao-producao-restrita.md)

## Logs seguros

A API registra logs tecnicos em JSON para requisicoes HTTP e erros inesperados.
Esses logs incluem metodo, rota, status HTTP, duracao e contexto autenticado
quando existir. Campos sensiveis como token, senha, certificado e XML fiscal
sao mascarados e o body completo da requisicao nao e registrado.
