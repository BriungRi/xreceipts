const DB_NAME = "xreceipts";
const DB_VERSION = 1;
const STORE_NAME = "receipts";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("createdAt", "createdAt");
      store.createIndex("searchText", "searchText");
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addReceipt(receipt) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(receipt);
    tx.oncomplete = () => resolve(receipt);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getReceipts() {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
