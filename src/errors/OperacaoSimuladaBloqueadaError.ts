export class OperacaoSimuladaBloqueadaError extends Error {
  constructor() {
    super(
      'Operacao simulada bloqueada em producao. Use o fluxo fiscal oficial da SEFIN Nacional.',
    );
    this.name = 'OperacaoSimuladaBloqueadaError';
  }
}
