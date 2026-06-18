CREATE TABLE "configuracoes_fiscais_empresas" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "ambienteFiscalPadrao" "AmbienteFiscal" NOT NULL DEFAULT 'HOMOLOGACAO',
  "serieDpsPadrao" TEXT NOT NULL DEFAULT '1',
  "certificadoA1Path" TEXT,
  "certificadoA1Senha" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "configuracoes_fiscais_empresas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "configuracoes_fiscais_empresas_empresaId_key"
ON "configuracoes_fiscais_empresas"("empresaId");

CREATE INDEX "configuracoes_fiscais_empresas_empresaId_idx"
ON "configuracoes_fiscais_empresas"("empresaId");

ALTER TABLE "configuracoes_fiscais_empresas"
ADD CONSTRAINT "configuracoes_fiscais_empresas_empresaId_fkey"
FOREIGN KEY ("empresaId")
REFERENCES "empresas"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
