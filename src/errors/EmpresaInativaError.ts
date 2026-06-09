export class EmpresaInativaError extends Error {
  constructor() {
    super('A empresa está inativa.');
    this.name = 'EmpresaInativaError';
  }
}
