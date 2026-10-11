// 첨부 파일 본문 저장: 확장 프로그램 출처의 IndexedDB (옵션 화면·background 공용, content script는 접근 불가)
// 메타데이터는 이력서 resume.attachments, 본문은 여기 id별 Blob (docs/design/resume_schema_v1.md 6장)
// storage.local(10MB 한도)·unlimitedStorage 권한 없이 대용량 저장

const DB_NAME = 'resume-files';
const STORE = 'files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = action(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export const putFile = (id: string, blob: Blob) => run('readwrite', (s) => s.put(blob, id)).then(() => undefined);
export const getFile = (id: string) => run<Blob | undefined>('readonly', (s) => s.get(id));
export const deleteFile = (id: string) => run('readwrite', (s) => s.delete(id));
export const clearFiles = () => run('readwrite', (s) => s.clear());
export const listFileIds = () => run('readonly', (s) => s.getAllKeys()).then((keys) => keys.map(String));
