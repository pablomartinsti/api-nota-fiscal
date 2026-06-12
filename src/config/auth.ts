import { env } from './env';

export function obterJwtSecret(): string {
  return env.JWT_SECRET;
}
