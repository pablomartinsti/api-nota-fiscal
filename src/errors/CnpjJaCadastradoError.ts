export class CnpjJaCadastradoError extends Error {
  constructor() {
    super('Já existe uma empresa cadastrada com este CNPJ.');
    this.name = 'CnpjJaCadastradoError';
  }
}
