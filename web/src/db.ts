import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Item } from "@reelmarks/shared";

interface ReelDB extends DBSchema {
  items: { key: string; value: Item };
}

const DB_NAME = "reelmarks";
const STORE = "items";
const VERSION = 10;

let dbp: Promise<IDBPDatabase<ReelDB>> | null = null;

function db(): Promise<IDBPDatabase<ReelDB>> {
  if (!dbp) {
    dbp = openDB<ReelDB>(DB_NAME, VERSION, {
      upgrade(d, _oldVersion, _newVersion, tx) {
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: "id" });
        } else {
          // Schema of stored items changed — clear so the new sample reseeds.
          tx.objectStore(STORE).clear();
        }
      },
    });
  }
  return dbp;
}

/** Upsert by id — re-scrapes merge instead of duplicating. */
export async function saveItems(items: Item[]): Promise<void> {
  const d = await db();
  const tx = d.transaction(STORE, "readwrite");
  await Promise.all(items.map((it) => tx.store.put(it)));
  await tx.done;
}

export async function allItems(): Promise<Item[]> {
  const d = await db();
  return d.getAll(STORE);
}
