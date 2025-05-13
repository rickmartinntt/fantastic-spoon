import { useState, useCallback } from "react";
import { BlobServiceClient } from "@azure/storage-blob";
import type { BlobUploadCommonResponse } from "@azure/storage-blob";

const account = import.meta.env.VITE_STORAGE_ACCOUNT;
const sas     = import.meta.env.VITE_STORAGE_SAS;           // begins with "?"
if (!account || !sas) {
  throw new Error(
    "VITE_STORAGE_ACCOUNT or VITE_STORAGE_SAS is missing in the env"
  );
}
const serviceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net${
    sas.startsWith("?") ? sas : "?" + sas
  }`
);
export interface UploadResult {
  fileName: string;
  status:  "success" | "error";
  url?:    string;                 // blob URL if success
  message: string;                 // error or "Uploaded"
}

export type UploadStatus = "waiting" | "uploading" | "success" | "error";

export interface UploadInfo {
  file:      File;
  progress:  number;          // 0–100
  status:    UploadStatus;
  url?:      string;          // set when success
  message?:  string;          // error text or "Uploaded"
}

/* ─── hook ---------------------------------------------------------------- */
export function useAzureBlobUpload() {
  const [items, setItems] = useState<UploadInfo[]>([]);
  const [uploading, setUploading] = useState(false);

  /* helper to update one UploadInfo by file‐name */
  const update = (name: string, patch: Partial<UploadInfo>) =>
    setItems((old) =>
      old.map((it) => (it.file.name === name ? { ...it, ...patch } : it))
    );

  /* main function called by the page */
const uploadFiles = useCallback(
  async (containerNameRaw: string, files: File[]) => {
    const containerName = containerNameRaw.toLowerCase();   // <─ here
    if (!containerName || files.length === 0) return;
      
      /* initialise table rows */
      setItems(
        files.map((f) => ({
          file: f,
          progress: 0,
          status: "waiting",
        }))
      );

      setUploading(true);
      const container = serviceClient.getContainerClient(containerName);
      await container.createIfNotExists();

      await Promise.all(
        files.map(async (file) => {
          const blobClient = container.getBlockBlobClient(file.name);

          update(file.name, { status: "uploading" });

          try {
            const resp: BlobUploadCommonResponse = await blobClient.uploadBrowserData(
              file,
              {
                blobHTTPHeaders: { blobContentType: file.type },
                onProgress: (ev) =>
                  update(file.name, {
                    progress: Math.round((ev.loadedBytes / file.size) * 100),
                  }),
              }
            );

            update(file.name, {
              status: "success",
              progress: 100,
              url: `${blobClient.url}${sas.startsWith("?") ? sas : "?" + sas}`,
              message: "Uploaded",
            });
          } catch (e: any) {
            console.error(e);
            update(file.name, {
              status: "error",
              message: e?.message || "Upload failed",
            });
          }
        })
      );

      setUploading(false);
    },
    []
  );

  return { uploading, items, uploadFiles, update };
}
export interface ExistingBlob {
  name: string;
  size: number;
  lastModified: Date | undefined;
  url: string;
}


export async function listBlobs(
  containerName: string
  ): Promise<ExistingBlob[]> {
  const container = serviceClient.getContainerClient(
    containerName.toLowerCase()
  );

  const result: ExistingBlob[] = [];
  if (!(await container.exists())) return result;

  for await (const b of container.listBlobsFlat()) {
    result.push({
      name: b.name,
      size: b.properties.contentLength ?? 0,
      lastModified: b.properties.lastModified,
      url:
        `${container.url}/` +
        encodeURIComponent(b.name) +
        (sas.startsWith("?") ? sas : "?" + sas),
    });
  }
  return result;
}