import { useState } from "react";
import {
  Dialog,
  DialogPortal,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./dialog";   // ← adapt the import path if necessary
import { Button } from "./button";

import { Document, Page, pdfjs } from "react-pdf";

// ── WORKER ───────────────────────────────────────────────────────────
//  Pick ONE of the two variants.  The CDN variant is the easiest.
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.2.133/build/pdf.worker.min.js`;
// pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"; // if you copied it to /public
// ─────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileName: string;
};

export default function FileViewerModal({
  open,
  onOpenChange,
  url,
  fileName,
}: Props) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const onPdfLoad = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setIsLoading(false);
  };

  const ext = fileName.split(".").pop()?.toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/* ──────────  custom LIGHT overlay  ────────── */}
        <div className="fixed inset-0 z-50 bg-gray-300/90 backdrop-blur-sm" />

        {/* ──────────  actual dialog panel  ────────── */}
        <DialogContent
          aria-describedby="viewer-desc"
          className="relative z-50 max-w-4xl bg-white shadow-lg"
        >
          <DialogDescription id="viewer-desc" className="sr-only">
            Document preview dialog. Press Esc to close.
          </DialogDescription>

          <DialogHeader>
            <DialogTitle>{fileName}</DialogTitle>
          </DialogHeader>

          {/* ------------ preview area ------------ */}
          <div className="flex flex-col items-center space-y-4">
            {/* PDF */}
            {ext === "pdf" && (
              <>
                {isLoading && (
                  <div className="mt-8 h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                )}

                <Document
                  file={url}
                  onLoadSuccess={onPdfLoad}
                  onLoadError={(e) => {
                    console.error("PDF load error", e);
                    setIsLoading(false);
                  }}
                >
                  {!isLoading && (
                    <Page
                      pageNumber={pageNumber}
                      width={800}
                      renderTextLayer={false}
                    />
                  )}
                </Document>

                {numPages && numPages > 1 && (
                  <div className="flex items-center gap-4">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pageNumber <= 1}
                      onClick={() => setPageNumber((p) => p - 1)}
                    >
                      Prev
                    </Button>
                    <span className="text-sm">
                      Page {pageNumber} of {numPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pageNumber >= numPages}
                      onClick={() => setPageNumber((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Image */}
            {ext &&
              ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext) && (
                <img
                  src={url}
                  alt={fileName}
                  className="max-h-[75vh] object-contain"
                />
              )}

            {/* Fallback */}
            {!["pdf", "jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(
              ext ?? ""
            ) && (
              <p>
                Preview unsupported.&nbsp;
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600"
                >
                  Download instead
                </a>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}