export class ProducaoRealBloqueadaError extends Error {
  constructor() {
    super(
      'Operacao em producao real bloqueada por seguranca. Configure NFSE_PERMITIR_PRODUCAO_REAL=true para permitir.',
    );
    this.name = 'ProducaoRealBloqueadaError';
  }
}
