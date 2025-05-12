import { useState } from "react";

interface UploadResponse {
  success: boolean;
  message: string;
  data?: any;
}

export const useFileUpload = (uploadUrl: string) => {
  const [uploading, setUploading] = useState(false);
  const [response, setResponse] = useState<UploadResponse | null>(null);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    setUploading(true);

    try {
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const jsonResponse = await res.json();
      setResponse({
        success: res.ok,
        message: jsonResponse.message,
        data: jsonResponse.data,
      });

      if (!res.ok) {
        throw new Error(jsonResponse.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setResponse({
        success: false,
        message: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  return { uploading, response, uploadFiles };
};