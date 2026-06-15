import { Empresa } from '../entities/Empresa';
import { NotaServico } from '../entities/NotaServico';
import { Servico } from '../entities/Servico';

export interface DadosProntidaoFiscalDps {
  empresa: Empresa;
  servico: Servico;
  nota: NotaServico;
}

export function listarPendenciasFiscaisDps(
  dados: DadosProntidaoFiscalDps,
): string[] {
  const pendencias: string[] = [];

  adicionarPendencia(
    pendencias,
    dados.empresa.codigoMunicipioIbge,
    'empresa.codigoMunicipioIbge',
  );
  adicionarPendencia(
    pendencias,
    dados.servico.codigoTributacaoNacional,
    'servico.codigoTributacaoNacional',
  );
  adicionarPendencia(pendencias, dados.nota.serieDps, 'nota.serieDps');
  adicionarPendencia(pendencias, dados.nota.numeroDps, 'nota.numeroDps');
  adicionarPendencia(
    pendencias,
    dados.nota.dataCompetencia,
    'nota.dataCompetencia',
  );
  adicionarPendencia(
    pendencias,
    dados.nota.codigoMunicipioPrestacao,
    'nota.codigoMunicipioPrestacao',
  );

  if (dados.nota.aliquotaIss > 9.99) {
    pendencias.push('nota.aliquotaIss');
  }

  if (
    dados.servico.codigoTributacaoMunicipal &&
    !/^\d{3}$/.test(dados.servico.codigoTributacaoMunicipal)
  ) {
    pendencias.push('servico.codigoTributacaoMunicipal');
  }

  return pendencias;
}

function adicionarPendencia(
  pendencias: string[],
  valor: unknown,
  campo: string,
): void {
  if (valor === undefined || valor === null || valor === '') {
    pendencias.push(campo);
  }
}
