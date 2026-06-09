import { GeradorHash } from '../GeradorHash';

export class FakeGeradorHash implements GeradorHash {
  valoresRecebidos: string[] = [];

  async gerar(valor: string): Promise<string> {
    this.valoresRecebidos.push(valor);

    return `hash:${valor}`;
  }
}
