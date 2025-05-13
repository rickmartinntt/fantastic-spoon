import { useCallback, useEffect, useRef, useState } from "react";
import { listBlobs, useAzureBlobUpload } from "../hooks/useAzureBlobUpload";
import type { ExistingBlob, UploadInfo } from "../hooks/useAzureBlobUpload";

import { Plus } from "lucide-react";
import { Progress } from "../components/ui/progress";
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

/* ───────────────────────────────────────── helpers */
const COLLECTION_KEY = "collections";
const loadCollections = (): string[] =>
  JSON.parse(localStorage.getItem(COLLECTION_KEY) ?? '["default"]');
const saveCollections = (list: string[]) =>
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(list));

/* ───────────────────────────────────────── component */
export default function HomePage() {
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
  const { uploading, items, uploadFiles } = useAzureBlobUpload();

  /* rows that exist already in storage */
  const [stored, setStored] = useState<UploadInfo[]>([]);

  /* convert ExistingBlob → UploadInfo */
  const blobToRow = (b: ExistingBlob, collection: string): UploadInfo => ({
    collection,
    permission: undefined,
    file: new File([], b.name), // dummy File, only name is used for key/size
    progress: 100,
    status: "success",
    url: b.url,
    message: "Uploaded",
  });

  /* load blobs of one container */
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

  /* keep track of which containers have been queried already */
  const loaded = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loaded.current.has(currentCollection)) return;
    loadContainer(currentCollection).then(() =>
      loaded.current.add(currentCollection)
    );
  }, [currentCollection, loadContainer]);

  /* local file picker */
  const [files, setFiles] = useState<File[]>([]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  /* upload */
  const handleUpload = async () => {
    await uploadFiles(currentCollection, files, permission);
    await loadContainer(currentCollection);
    setFiles([]); // clear picker
  };

  /* ───────────────────────────────────────── render */
  return (
    <div className="flex min-h-screen flex-col">
      {/* main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── left sidebar */}
        <aside className="w-72 shrink-0 border-r p-6 space-y-4">
          {/* file selector */}
          <div className="space-y-2">
            <Label htmlFor="fileInput">Choose files</Label>
            <Input
              id="fileInput"
              type="file"
              multiple
              onChange={handleFileChange}
            />
            <Button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
            >
              {uploading ? "Uploading…" : "Upload Files"}
            </Button>
          </div>

          {/* collection selector */}
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

          {/* permission selector */}
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

        {/* ─── right table */}
        <main className="flex-1 overflow-auto p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collection</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status / Progress</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {[...stored, ...items].map((row) => (
                <TableRow
                  key={row.collection + row.file.name + row.status}
                >
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
                  <TableCell className="w-56">
                    {row.status === "uploading" && (
                      <>
                        <Progress value={row.progress} className="h-2 mb-1" />
                        <span className="text-sm text-gray-500">
                          {row.progress} %
                        </span>
                      </>
                    )}
                    {row.status === "success" && (
                      <span className="text-green-600">{row.message}</span>
                    )}
                    {row.status === "error" && (
                      <span className="text-red-600">{row.message}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.url && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => window.open(row.url, "_blank")}
                      >
                        Open
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {stored.length + items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No files in this collection
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </main>
      </div>

      {/* add-collection dialog */}
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
    </div>
  );
}