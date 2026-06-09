import bcrypt from 'bcrypt';

import { GeradorHash } from './GeradorHash';

export class BcryptGeradorHash implements GeradorHash {
  constructor(private readonly saltRounds = 10) {}

  async gerar(valor: string): Promise<string> {
    return bcrypt.hash(valor, this.saltRounds);
  }
}
