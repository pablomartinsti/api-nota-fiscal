import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';

import { BcryptGeradorHash } from './BcryptGeradorHash';

describe('BcryptGeradorHash', () => {
  it('deve gerar um hash verificável sem preservar a senha original', async () => {
    const geradorHash = new BcryptGeradorHash();

    const hash = await geradorHash.gerar('senha-segura');

    expect(hash).not.toBe('senha-segura');
    await expect(bcrypt.compare('senha-segura', hash)).resolves.toBe(true);
  });
});
