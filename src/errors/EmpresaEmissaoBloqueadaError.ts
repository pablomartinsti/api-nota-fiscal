export class EmpresaEmissaoBloqueadaError extends Error {
  constructor() {
    super('Emissao de NFS-e bloqueada para esta empresa.');
    this.name = 'EmpresaEmissaoBloqueadaError';
  }
}
