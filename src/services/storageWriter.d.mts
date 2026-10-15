export function writeLocalJson(
  storage: Pick<Storage, 'setItem'>,
  key: string,
  value: unknown
): void;

export function readLocalJson<T extends unknown[]>(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
  fallback: T
): T;
