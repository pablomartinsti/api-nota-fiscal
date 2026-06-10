import bcrypt from 'bcrypt';

import { ComparadorHash } from './ComparadorHash';

export class BcryptComparadorHash implements ComparadorHash {
  async comparar(valor: string, hash: string): Promise<boolean> {
    return bcrypt.compare(valor, hash);
  }
}
