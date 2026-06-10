import { describe, expect, it } from 'vitest';

import { BcryptComparadorHash } from './BcryptComparadorHash';
import { BcryptGeradorHash } from './BcryptGeradorHash';

describe('BcryptComparadorHash', () => {
  it('deve identificar senha correta e rejeitar senha incorreta', async () => {
    const geradorHash = new BcryptGeradorHash(4);
    const comparadorHash = new BcryptComparadorHash();
    const hash = await geradorHash.gerar('senha-segura');

    await expect(
      comparadorHash.comparar('senha-segura', hash),
    ).resolves.toBe(true);
    await expect(
      comparadorHash.comparar('senha-incorreta', hash),
    ).resolves.toBe(false);
  });
});
