import { useState, useCallback } from "react";
import { BlobServiceClient } from "@azure/storage-blob";

const account = import.meta.env.VITE_STORAGE_ACCOUNT;
const sas     = import.meta.env.VITE_STORAGE_SAS;           // begins with "?"

const serviceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net${sas}`
);

export function useAzureBlobUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (containerName: string, files: File[]) => {
      if (!containerName || files.length === 0) return;

      setUploading(true);
      setError(null);

      try {
        const container = serviceClient.getContainerClient(containerName);
        // create container if it does not exist (harmless if it already exists)
        await container.createIfNotExists();

        // loop through the File[] selected in the input
        for (const file of files) {
          const blobClient = container.getBlockBlobClient(file.name);
          await blobClient.uploadBrowserData(file, {
            blobHTTPHeaders: { blobContentType: file.type },
            // onProgress is optional, but you can wire it to a progress bar
          });
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "upload failed");
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return { uploading, error, uploadFiles };
}
