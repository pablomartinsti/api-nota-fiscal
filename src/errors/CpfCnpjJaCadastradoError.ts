export class CpfCnpjJaCadastradoError extends Error {
  constructor() {
    super('Já existe um cliente com este CPF/CNPJ nesta empresa.');
    this.name = 'CpfCnpjJaCadastradoError';
  }
}
