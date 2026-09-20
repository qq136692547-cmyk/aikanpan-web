import test from "node:test";
import assert from "node:assert/strict";

import { loadScopedStorage, userStorageKey } from "../src/lib/research-storage.ts";

function storageFrom(entries) {
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(entries, key) ? entries[key] : null;
    },
  };
}

test("scoped research data wins over legacy data", () => {
  const key = "aikanpan_research_plans";
  const storage = storageFrom({
    [key]: JSON.stringify([{ id: "legacy" }]),
    [userStorageKey(key, "user-1")]: JSON.stringify([{ id: "scoped" }]),
  });

  const loaded = loadScopedStorage(storage, key, "user-1", []);

  assert.deepEqual(loaded.value, [{ id: "scoped" }]);
  assert.equal(loaded.fromLegacy, false);
});

test("legacy research data is migrated when scoped data is absent", () => {
  const key = "aikanpan_research_theses";
  const storage = storageFrom({
    [key]: JSON.stringify([{ id: "old" }]),
  });

  const loaded = loadScopedStorage(storage, key, "user-2", []);

  assert.deepEqual(loaded.value, [{ id: "old" }]);
  assert.equal(loaded.fromLegacy, true);
});

test("missing or invalid research data falls back safely", () => {
  const key = "aikanpan_research_profiles";
  const storage = storageFrom({
    [userStorageKey(key, "user-3")]: "{invalid",
  });

  const loaded = loadScopedStorage(storage, key, "user-3", {});

  assert.deepEqual(loaded.value, {});
  assert.equal(loaded.fromLegacy, false);
});
