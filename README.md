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
`NFSE_SEFIN_BASE_URL` deve ficar sem `/API`. O endpoint interno
`POST /notas-servico/:notaId/enviar-dps` registra sucesso ou erro fiscal na
NotaServico conforme o retorno recebido. A rota
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
NFSE_XSD_DPS_PATH=""
NFSE_XSD_EVENTO_PATH=""
NFSE_SEFIN_BASE_URL="https://sefin.producaorestrita.nfse.gov.br/SefinNacional"
NFSE_SEFIN_ENVIO_DPS_PATH="/nfse"
NFSE_SEFIN_TIMEOUT_MS=15000
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
do `.env` como fallback.

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
`certificadoA1SenhaConfigurada`. Quando `certificadoA1Path` e
`certificadoA1Senha` forem informados, a API valida o arquivo A1, a senha, a
validade do certificado e se o CNPJ do certificado pertence a empresa
autenticada antes de salvar a configuracao. A senha do certificado e
criptografada com `NFSE_CERTIFICADO_CRYPTO_KEY` antes de ser persistida no
banco.

Antes da emissao real completa, sera necessario armazenar certificados digitais
por empresa com seguranca e evoluir os demais endpoints fiscais, como consulta
por chave de acesso e eventos de cancelamento.

Para preparar o primeiro teste em Producao Restrita, consulte:

- [Guia de homologacao em Producao Restrita](docs/homologacao-producao-restrita.md)
