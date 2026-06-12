export class ServicoInativoError extends Error {
  constructor() {
    super('Servico inativo nao pode ser utilizado em uma nota.');
    this.name = 'ServicoInativoError';
  }
}
