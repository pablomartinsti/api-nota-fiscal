ALTER TABLE "notas_servico"
ADD COLUMN "notaSubstituidaId" TEXT,
ADD COLUMN "chaveAcessoSubstituida" TEXT,
ADD COLUMN "codigoMotivoSubstituicao" TEXT,
ADD COLUMN "motivoSubstituicao" TEXT;

CREATE INDEX "notas_servico_notaSubstituidaId_idx"
ON "notas_servico"("notaSubstituidaId");

ALTER TABLE "notas_servico"
ADD CONSTRAINT "notas_servico_notaSubstituidaId_fkey"
FOREIGN KEY ("notaSubstituidaId")
REFERENCES "notas_servico"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
