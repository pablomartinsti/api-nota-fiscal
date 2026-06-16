export class XmlDpsInvalidoError extends Error {
  constructor(readonly erros: string[] = []) {
    super('O XML da DPS nao atende ao schema configurado.');
    this.name = 'XmlDpsInvalidoError';
  }
}
