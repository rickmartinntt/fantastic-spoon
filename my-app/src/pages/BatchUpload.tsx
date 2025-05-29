import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { listBlobs, useAzureBlobUpload } from "../hooks/useAzureBlobUpload";  //Imports functions
import type { ExistingBlob, UploadInfo } from "../hooks/useAzureBlobUpload";  //Imports interface
import FileViewerModal from "../components/ui/fileviewer";
import UploadProgressModal from "../components/ui/upload-progress-modal";
import { Plus, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

/* ───────────────────────── helpers */
const COLLECTION_KEY = "collections";
const loadCollections = (): string[] =>
  JSON.parse(localStorage.getItem(COLLECTION_KEY) ?? '["default"]');
const saveCollections = (list: string[]) =>
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(list));

/* ───────────────────────── component */
export default function BatchPage() {
  /* collections */
  const [collections, setCollections] = useState<string[]>(loadCollections);
  const [currentCollection, setCurrentCollection] = useState<string>(
    collections[0]
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCollection, setNewCollection] = useState("");

  useEffect(() => saveCollections(collections), [collections]);

  const addCollection = () => {
    const name = newCollection.trim().toLowerCase();
    if (!name) return;
    setCollections((prev) => Array.from(new Set([...prev, name])));
    setCurrentCollection(name);
    setNewCollection("");
    setShowAddDialog(false);
  };

  /* permissions */
  const permissionOptions = ["Private", "Org-Wide", "Public"];
  const [permission, setPermission] = useState(permissionOptions[0]);

  /* upload hook */
  const { uploadFiles } = useAzureBlobUpload(); // we’ll manage “uploading” locally

  /* rows already in storage */
  const [stored, setStored] = useState<UploadInfo[]>([]);

  const blobToRow = (b: ExistingBlob, collection: string): UploadInfo => ({
    collection,
    permission: undefined,
    file: new File([], b.name),
    progress: 100,
    status: "success",
    url: b.url,
    message: "Uploaded",
  });

  const loadContainer = useCallback(
    async (collection: string) => {
      const blobs = await listBlobs(collection);
      setStored((prev) => [
        ...prev.filter((r) => r.collection !== collection),
        ...blobs.map((b) => blobToRow(b, collection)),
      ]);
    },
    []
  );

  const loaded = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (loaded.current.has(currentCollection)) return;
    loadContainer(currentCollection).then(() =>
      loaded.current.add(currentCollection)
    );
  }, [currentCollection, loadContainer]);

  /* ───────── file picker & list */
  const [files, setFiles] = useState<File[]>([]);
  const addFiles = (list: FileList | File[]) => {
    if (!list || list.length === 0) return;
    setFiles((prev) => [
      ...prev,
      ...Array.from(list).filter(
        (f) => !prev.some((p) => p.name === f.name && p.size === f.size)
      ),
    ]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    addFiles(e.target.files!);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) =>
    e.preventDefault();

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  /* size / time */
  const totalMB = useMemo(
    () => files.reduce((s, f) => s + f.size / 1_048_576, 0),
    [files]
  );
  const estimatedTimeMin = totalMB * 1.5;

  /* ───────── upload progress state */
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadedMB, setUploadedMB] = useState(0);
  const [progressModalOpen, setProgressModalOpen] = useState(false);

  const startUpload = async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    setProgressModalOpen(true);
    setUploadedCount(0);
    setUploadedMB(0);

    for (let i = 0; i < files.length; i++) {
      await uploadFiles(currentCollection, [files[i]], permission);
      await loadContainer(currentCollection);

      setUploadedCount(i + 1);
      setUploadedMB((prev) => prev + files[i].size / 1_048_576);
    }

    // done
    setFiles([]);
    setIsUploading(false);
  };

  /* ───────── pagination */
  const ROWS_PER_PAGE = 10;
  const [page, setPage] = useState(1);
  const allRows = [...stored]; // items are managed by hook internally
  const totalPages = Math.max(1, Math.ceil(allRows.length / ROWS_PER_PAGE));
  const pageRows = allRows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  /* ───────── viewer modal */
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] =
    useState<{ url: string; fileName: string } | null>(null);

  useEffect(() => setPage(1), [currentCollection, stored.length]);

  /* ───────── render */
  return (
    <>
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 overflow-hidden">
          {/* ─── Sidebar */}
          <aside className="w-72 shrink-0 border-r p-6 space-y-6">
            {/* Picker + DnD */}
            <div className="space-y-3">
              <Label htmlFor="fileInput">Choose or drop files</Label>
              <Input id="fileInput" type="file" multiple onChange={handleFileChange} />

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="flex h-24 items-center justify-center rounded border-2 border-dashed border-gray-400 bg-gray-50 text-sm text-gray-500"
              >
                Drag &amp; drop files here
              </div>

              {/* Selected list */}
              {files.length > 0 && (
                <div className="border rounded p-2 max-h-40 overflow-auto">
                  {files.map((f, idx) => (
                    <div
                      key={f.name + idx}
                      className="flex items-center justify-between text-sm py-0.5"
                    >
                      <span className="truncate">
                        {f.name} – {(f.size / 1_048_576).toFixed(2)} MB
                      </span>
                      <button
                        onClick={() => removeFile(idx)}
                        className="ml-2 text-gray-500 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* summary */}
              {files.length > 0 && (
                <div className="text-xs text-gray-600 space-y-0.5">
                  <p>
                    Files: <strong>{files.length}</strong>
                  </p>
                  <p>
                    Total: <strong>{totalMB.toFixed(2)} MB</strong>
                  </p>
                  <p>
                    ETA: <strong>{estimatedTimeMin.toFixed(1)} min</strong>
                  </p>
                </div>
              )}

              {/* Upload button */}
              <Button
                className="w-full bg-blue-500 text-white"
                onClick={startUpload}
                disabled={isUploading || files.length === 0}
              >
                Upload Files
              </Button>
            </div>

            {/* Collection & Permission pickers (unchanged) */}
            {/* … (same as before) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Collection</Label>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Select
                value={currentCollection}
                onValueChange={(v) => setCurrentCollection(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <Select value={permission} onValueChange={setPermission}>
                <SelectTrigger>
                  <SelectValue placeholder="Select permission" />
                </SelectTrigger>
                <SelectContent>
                  {permissionOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </aside>

          {/* ─── Table */}
          <main className="flex-1 overflow-auto p-6">
            {/* table unchanged except we removed items in-flight for brevity */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row.collection + row.file.name}>
                    <TableCell>{row.collection}</TableCell>
                    <TableCell>{row.file.name}</TableCell>
                    <TableCell>
                      {(row.file.size / 1024).toFixed(1)} KB
                    </TableCell>
                    <TableCell>
                      {row.file.lastModified
                        ? new Date(row.file.lastModified).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>{row.message}</TableCell>
                    <TableCell>
                      {row.url && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setViewerFile({ url: row.url, fileName: row.file.name });
                            setViewerOpen(true);
                          }}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {allRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No files in this collection
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* pagination */}
            {allRows.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <span className="text-sm">Page {page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* View-file dialog */}
      {viewerFile && (
        <FileViewerModal
          open={viewerOpen}
          onOpenChange={(o) => {
            if (!o) setViewerFile(null);
            setViewerOpen(o);
          }}
          url={viewerFile.url}
          fileName={viewerFile.fileName}
        />
      )}

      {/* Add-collection dialog (unchanged) */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
            <DialogDescription>
              Enter a name for the new collection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="newCollection">Name</Label>
            <Input
              id="newCollection"
              placeholder="e.g. invoices"
              value={newCollection}
              onChange={(e) => setNewCollection(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCollection()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewCollection("");
                setShowAddDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={addCollection}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload progress modal */}
      <UploadProgressModal
        open={progressModalOpen}
        totalFiles={files.length + uploadedCount} /* original total */
        uploadedFiles={uploadedCount}
        uploadedMB={uploadedMB}
        totalMB={totalMB}
        onClose={() => setProgressModalOpen(false)}
        uploading={isUploading}
      />
      <Button
        onClick={() => setProgressModalOpen(true)}
        className="fixed bottom-6 left-6 z-50 h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white p-0"
      >
        
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}