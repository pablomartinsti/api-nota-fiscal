import {
  GerenciadorToken,
  TokenPayload,
} from '../GerenciadorToken';

export class FakeGerenciadorToken implements GerenciadorToken {
  payloadsGerados: TokenPayload[] = [];

  async gerar(payload: TokenPayload): Promise<string> {
    this.payloadsGerados.push(payload);

    return 'token-valido';
  }

  async verificar(token: string): Promise<TokenPayload> {
    const payload = this.payloadsGerados[this.payloadsGerados.length - 1];

    if (token !== 'token-valido' || !payload) {
      throw new Error('Token inválido.');
    }

    return payload;
  }
}
