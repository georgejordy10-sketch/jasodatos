import type {
  ProcessDatasetResult,
  ReadDatasetInitialResult,
} from "@/core/ingestion/readDataset";
import type { ConfirmedMapping } from "@/core/mapping/types";
import type { DataQualityReport } from "./dataQuality";

const DB_NAME = "jasodatos-local";
const DB_VERSION = 1;
const STORE_NAME = "analysis-session";

export type PersistedAnalysisSession = {
  version: 1;
  savedAt: string;
  initialData: ReadDatasetInitialResult;
  confirmedMappings: ConfirmedMapping[];
  processedData: ProcessDatasetResult;
  qualityReport: DataQualityReport | null;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("No se pudo abrir IndexedDB."));
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export async function savePersistedAnalysisSession(
  sessionKey: string,
  session: Omit<PersistedAnalysisSession, "version" | "savedAt">
): Promise<void> {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      store.put(
        {
          ...session,
          version: 1,
          savedAt: new Date().toISOString(),
        } satisfies PersistedAnalysisSession,
        sessionKey
      );

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("No se pudo guardar el análisis local.")
        );
      transaction.onabort = () =>
        reject(
          transaction.error ??
            new Error("Se canceló el guardado del análisis local.")
        );
    });
  } finally {
    db.close();
  }
}

export async function loadPersistedAnalysisSession(
  sessionKey: string
): Promise<PersistedAnalysisSession | null> {
  const db = await openDatabase();

  try {
    return await new Promise<PersistedAnalysisSession | null>(
      (resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(sessionKey);

        request.onsuccess = () => {
          const value = request.result as
            | PersistedAnalysisSession
            | undefined;

          if (!value || value.version !== 1) {
            resolve(null);
            return;
          }

          resolve(value);
        };

        request.onerror = () => {
          reject(
            request.error ??
              new Error("No se pudo recuperar el análisis local.")
          );
        };
      }
    );
  } finally {
    db.close();
  }
}

export async function clearPersistedAnalysisSession(
  sessionKey: string
): Promise<void> {
  const db = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      store.delete(sessionKey);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("No se pudo limpiar el análisis local.")
        );
    });
  } finally {
    db.close();
  }
}