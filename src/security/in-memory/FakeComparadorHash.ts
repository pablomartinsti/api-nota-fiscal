import { ComparadorHash } from '../ComparadorHash';

export class FakeComparadorHash implements ComparadorHash {
  valoresRecebidos: Array<{ valor: string; hash: string }> = [];

  async comparar(valor: string, hash: string): Promise<boolean> {
    this.valoresRecebidos.push({ valor, hash });

    return hash === `hash:${valor}`;
  }
}
