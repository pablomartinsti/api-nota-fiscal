export class ProprietarioJaCadastradoError extends Error {
  constructor() {
    super('A empresa já possui um usuário proprietário.');
    this.name = 'ProprietarioJaCadastradoError';
  }
}
