-- CreateEnum
CREATE TYPE "TipoEventoFiscalNotaServico" AS ENUM ('ENVIO_DPS', 'CONSULTA_NFSE', 'RECONCILIACAO_ENVIO', 'CANCELAMENTO_NFSE');

-- CreateEnum
CREATE TYPE "StatusEventoFiscalNotaServico" AS ENUM ('SUCESSO', 'ERRO');

-- CreateTable
CREATE TABLE "notas_servico_eventos_fiscais" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "notaServicoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tipo" "TipoEventoFiscalNotaServico" NOT NULL,
    "status" "StatusEventoFiscalNotaServico" NOT NULL,
    "statusHttp" INTEGER,
    "chaveAcesso" TEXT,
    "mensagem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_servico_eventos_fiscais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notas_servico_eventos_fiscais_empresaId_idx" ON "notas_servico_eventos_fiscais"("empresaId");

-- CreateIndex
CREATE INDEX "notas_servico_eventos_fiscais_notaServicoId_idx" ON "notas_servico_eventos_fiscais"("notaServicoId");

-- CreateIndex
CREATE INDEX "notas_servico_eventos_fiscais_usuarioId_idx" ON "notas_servico_eventos_fiscais"("usuarioId");

-- CreateIndex
CREATE INDEX "notas_servico_eventos_fiscais_tipo_idx" ON "notas_servico_eventos_fiscais"("tipo");

-- CreateIndex
CREATE INDEX "notas_servico_eventos_fiscais_status_idx" ON "notas_servico_eventos_fiscais"("status");

-- AddForeignKey
ALTER TABLE "notas_servico_eventos_fiscais" ADD CONSTRAINT "notas_servico_eventos_fiscais_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_servico_eventos_fiscais" ADD CONSTRAINT "notas_servico_eventos_fiscais_notaServicoId_fkey" FOREIGN KEY ("notaServicoId") REFERENCES "notas_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_servico_eventos_fiscais" ADD CONSTRAINT "notas_servico_eventos_fiscais_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
