-- AlterTable
ALTER TABLE "notas_servico" ADD COLUMN     "chaveAcesso" TEXT,
ADD COLUMN     "dataAutorizacao" TIMESTAMP(3),
ADD COLUMN     "mensagemErroFiscal" TEXT,
ADD COLUMN     "protocoloEmissao" TEXT,
ADD COLUMN     "xmlAutorizado" TEXT;
