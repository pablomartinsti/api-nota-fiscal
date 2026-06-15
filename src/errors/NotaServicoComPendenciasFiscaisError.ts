export class NotaServicoComPendenciasFiscaisError extends Error {
  constructor(readonly pendencias: string[]) {
    super('A nota possui pendencias fiscais para gerar a DPS.');
    this.name = 'NotaServicoComPendenciasFiscaisError';
  }
}
