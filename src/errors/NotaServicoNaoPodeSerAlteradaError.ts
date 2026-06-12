export class NotaServicoNaoPodeSerAlteradaError extends Error {
  constructor() {
    super('Somente uma nota em rascunho pode ser alterada.');
    this.name = 'NotaServicoNaoPodeSerAlteradaError';
  }
}
