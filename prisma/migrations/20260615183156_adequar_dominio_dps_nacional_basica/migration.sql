-- CreateEnum
CREATE TYPE "RegimeEspecialTributacao" AS ENUM ('NENHUM', 'ATO_COOPERADO', 'ESTIMATIVA', 'MICROEMPRESA_MUNICIPAL', 'NOTARIO_REGISTRADOR', 'PROFISSIONAL_AUTONOMO', 'SOCIEDADE_PROFISSIONAIS', 'OUTROS');

-- CreateEnum
CREATE TYPE "RegimeApuracaoSimplesNacional" AS ENUM ('TRIBUTOS_FEDERAIS_E_MUNICIPAL_PELO_SN', 'TRIBUTOS_FEDERAIS_PELO_SN_E_ISS_FORA', 'TRIBUTOS_FEDERAIS_E_MUNICIPAL_FORA_DO_SN');

-- CreateEnum
CREATE TYPE "AmbienteFiscal" AS ENUM ('PRODUCAO', 'HOMOLOGACAO');

-- CreateEnum
CREATE TYPE "TributacaoIssqn" AS ENUM ('TRIBUTAVEL', 'IMUNIDADE', 'EXPORTACAO', 'NAO_INCIDENCIA');

-- CreateEnum
CREATE TYPE "TipoRetencaoIssqn" AS ENUM ('NAO_RETIDO', 'RETIDO_PELO_TOMADOR', 'RETIDO_PELO_INTERMEDIARIO');

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "codigoMunicipioIbge" TEXT;

-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "codigoMunicipioIbge" TEXT,
ADD COLUMN     "regimeApuracaoSimplesNacional" "RegimeApuracaoSimplesNacional",
ADD COLUMN     "regimeEspecialTributacao" "RegimeEspecialTributacao" NOT NULL DEFAULT 'NENHUM';

-- AlterTable
ALTER TABLE "notas_servico" ADD COLUMN     "ambienteFiscal" "AmbienteFiscal" NOT NULL DEFAULT 'HOMOLOGACAO',
ADD COLUMN     "codigoMunicipioPrestacao" TEXT,
ADD COLUMN     "dataCompetencia" TIMESTAMP(3),
ADD COLUMN     "informacoesComplementares" TEXT,
ADD COLUMN     "numeroDps" TEXT,
ADD COLUMN     "serieDps" TEXT,
ADD COLUMN     "tipoRetencaoIssqn" "TipoRetencaoIssqn" NOT NULL DEFAULT 'NAO_RETIDO',
ADD COLUMN     "tributacaoIssqn" "TributacaoIssqn" NOT NULL DEFAULT 'TRIBUTAVEL';

-- AlterTable
ALTER TABLE "servicos" ADD COLUMN     "codigoNbs" TEXT,
ADD COLUMN     "codigoTributacaoNacional" TEXT;
