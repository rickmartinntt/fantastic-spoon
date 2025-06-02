// useAzureBlobUpload.tsx
import { useState, useCallback } from "react";
import {
  BlobServiceClient,
  ContainerClient,
  RestError
} from "@azure/storage-blob";

/* ─── configuration ──────────────────────────────────────────────── */
const account = import.meta.env.VITE_STORAGE_ACCOUNT;
const sas     = import.meta.env.VITE_STORAGE_SAS;
if (!account || !sas) {
  throw new Error("VITE_STORAGE_ACCOUNT or VITE_STORAGE_SAS is missing");
}

const serviceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net${sas.startsWith("?") ? sas : "?" + sas}`,
);
const DEFAULT_CONTAINER = "default";

/* ── helper: make sure the container exists only once per tab ────── */
let ensurePromise: Promise<void> | null = null;
function ensureContainer(container: ContainerClient) {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      if (!(await container.exists())) {
        await container.create(); // 201, never 409
      }
    })();
  }
  return ensurePromise;
}

/* ─── data types ─────────────────────────────────────────────────── */
export type UploadStatus = "waiting" | "uploading" | "success" | "error";
export interface UploadInfo {
  file: File;
  progress: number;           // 0-100
  status: UploadStatus;
  message?: string;
  url?: string;

  permission?: "Private" | "Org-Wide" | "Public";
  docType?: string;           // ← query-set id
  persona?: string;           // ← persona drop-down
}

export interface ExistingBlob {
  name: string;
  size: number;
  lastModified: Date | undefined;
  url: string;

  permission?: string;
  docType?: string;
  persona?: string;
}

/* ─── React hook : upload files ──────────────────────────────────── */
export function useAzureBlobUpload() {
  const [items,     setItems]     = useState<UploadInfo[]>([]);
  const [uploading, setUploading] = useState(false);

  /* local helper to patch one item */
  const update = (name: string, patch: Partial<UploadInfo>) =>
    setItems(old =>
      old.map(it => (it.file.name === name ? { ...it, ...patch } : it)),
    );

  /**
   * Upload one or many files to the default container.
   *
   * @param files       Selected files from <input type="file">
   * @param permission  "Private" | "Org-Wide" | "Public"
   * @param docType     Rules / query-set id  (e.g. "ParticipationAgreement")
   * @param persona     Persona selected in UI
   */
  const uploadFiles = useCallback(
    async (
      files: File[],
      permission?: UploadInfo["permission"],
      docType?: string,
      persona?: string,
    ) => {
      if (!files.length) return;

      /* initialise table rows */
      setItems(
        files.map(f => ({
          file: f,
          progress: 0,
          status: "waiting",
          permission,
          docType,
          persona,
        })),
      );
      setUploading(true);

      const container = serviceClient.getContainerClient(DEFAULT_CONTAINER);
      await ensureContainer(container);

      /* run uploads in parallel */
      await Promise.all(
        files.map(async file => {
          const blobClient = container.getBlockBlobClient(file.name);
          update(file.name, { status: "uploading" });

          /* build metadata – ASCII keys & string values */
          const md: Record<string, string> = {};
          if (permission) md.permission = permission;    // Azure stores lower-case anyway
          if (docType)    md.doctype    = docType;
          if (persona)    md.persona    = persona;

          try {
            await blobClient.uploadBrowserData(file, {
              blobHTTPHeaders: { blobContentType: file.type },
              metadata: Object.keys(md).length ? md : undefined,
              onProgress: ev =>
                update(file.name, {
                  progress: Math.round((ev.loadedBytes / file.size) * 100),
                }),
            });

            update(file.name, {
              status: "success",
              progress: 100,
              url: blobClient.url,
              message: "Uploaded",
            });
          } catch (e: any) {
            console.error(e);
            update(file.name, {
              status: "error",
              message:
                (e as RestError)?.message ?? (e as Error)?.message ?? "Upload failed",
            });
          }
        }),
      );

      setUploading(false);
    },
    [],
  );

  return { uploading, items, uploadFiles, update };
}

/* ─── list blobs (with metadata) ─────────────────────────────────── */
export async function listBlobs(): Promise<ExistingBlob[]> {
  const container = serviceClient.getContainerClient(DEFAULT_CONTAINER);
  await ensureContainer(container);

  const result: ExistingBlob[] = [];
  for await (const b of container.listBlobsFlat({ includeMetadata: true })) {
    result.push({
      name: b.name,
      size: b.properties.contentLength ?? 0,
      lastModified: b.properties.lastModified,
      url: `${container.url}/${encodeURIComponent(b.name)}`,

      permission: b.metadata?.permission,
      docType:    b.metadata?.doctype,
      persona:    b.metadata?.persona,
    });
  }
  return result;
}