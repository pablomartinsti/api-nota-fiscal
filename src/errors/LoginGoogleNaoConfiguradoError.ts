export class LoginGoogleNaoConfiguradoError extends Error {
  constructor() {
    super('Login com Google nao configurado.');
    this.name = 'LoginGoogleNaoConfiguradoError';
  }
}
