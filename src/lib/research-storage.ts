export interface ScopedStorageLoad<T> {
  value: T;
  fromLegacy: boolean;
}

type StorageReader = Pick<Storage, "getItem">;

export function userStorageKey(key: string, userId: string): string {
  return `${key}:${userId}`;
}

function parseValue<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadScopedStorage<T>(
  storage: StorageReader | null,
  key: string,
  userId: string,
  fallback: T
): ScopedStorageLoad<T> {
  if (!storage) return { value: fallback, fromLegacy: false };

  const scopedRaw = storage.getItem(userStorageKey(key, userId));
  if (scopedRaw !== null) {
    return { value: parseValue(scopedRaw, fallback), fromLegacy: false };
  }

  const legacyRaw = storage.getItem(key);
  if (legacyRaw !== null) {
    return { value: parseValue(legacyRaw, fallback), fromLegacy: true };
  }

  return { value: fallback, fromLegacy: false };
}
