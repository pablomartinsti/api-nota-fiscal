export class EmailJaCadastradoError extends Error {
  constructor() {
    super('Já existe um usuário cadastrado com este e-mail.');
    this.name = 'EmailJaCadastradoError';
  }
}
