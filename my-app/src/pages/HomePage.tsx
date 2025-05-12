import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAzureBlobUpload } from "../hooks/useAzureBlobUpload"; // Import the custom hook

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

// Helpers ────────────────────────────────────────────────
const COLLECTION_KEY = "collections";

const loadCollections = (): string[] => {
  const raw = localStorage.getItem(COLLECTION_KEY);
  return raw ? (JSON.parse(raw) as string[]) : ["Default"];
};

const saveCollections = (list: string[]) =>
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(list));

// Main component ─────────────────────────────────────────
export default function HomePage() {
  /* collections ---------------------------------------------------------- */
  const [collections, setCollections] = useState<string[]>(() => loadCollections());
  const [currentCollection, setCurrentCollection] = useState<string>(collections[0]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCollection, setNewCollection] = useState("");

  /* permissions ---------------------------------------------------------- */
  const permissionOptions = ["Private", "Org-Wide", "Public"];
  const [permission, setPermission] = useState(permissionOptions[0]);

  /* files ---------------------------------------------------------------- */
  const [files, setFiles] = useState<File[]>([]);
  const { uploading, error, uploadFiles } = useAzureBlobUpload();
  /* keep localStorage in sync */
  useEffect(() => {
    saveCollections(collections);
  }, [collections]);

  /* handlers ------------------------------------------------------------- */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  };

  const addCollection = () => {
    if (!newCollection.trim()) return;
    const updated = Array.from(new Set([...collections, newCollection.trim()]));
    setCollections(updated);
    setCurrentCollection(newCollection.trim());
    setNewCollection("");
    setShowAddDialog(false);
  };


const handleUpload = () => {
  uploadFiles(currentCollection, files);
};

  /* render --------------------------------------------------------------- */
  return (
    <div className="flex min-h-screen flex-col">
      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar components */}
        <aside className="w-72 shrink-0 border-r p-6">
          <div className="space-y-4">
            {/* File selector */}
            <Label htmlFor="fileInput">Choose files</Label>
            <Input
              id="fileInput"
              type="file"
              multiple
              onChange={handleFileChange}
            />
            {error && <p className="text-red-600">{error}</p>}
            <Button 
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={handleUpload} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Files"}
            </Button>

            {/* Collection dropdown w/ add-button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Collection Name</Label>
                <Button 
                  className="bg-blue-500 text-white px-4 py-2 rounded"
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
                  {collections.map((col) => (
                    <SelectItem value={col} key={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permissions dropdown */}
            <div className="space-y-2">
              <Label>Permissions</Label>
              <Select value={permission} onValueChange={setPermission}>
                <SelectTrigger>
                  <SelectValue placeholder="Select permission" />
                </SelectTrigger>
                <SelectContent>
                  {permissionOptions.map((p) => (
                    <SelectItem value={p} key={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </aside>

        {/* Table area (right) */}
        <main className="flex-1 overflow-auto p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collection</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>File Size</TableHead>
                <TableHead>File Date</TableHead>
                <TableHead>File Status</TableHead>
                <TableHead>File Link</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {files.map((file, index) => (
                <TableRow 
                  key={file.name + file.size}
                  className={`border-b border-gray-300 ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <TableCell>{currentCollection}</TableCell>
                  <TableCell>{file.name}</TableCell>
                  <TableCell>{(file.size / 1024).toFixed(1)} KB</TableCell>
                  <TableCell>
                    {new Date(file.lastModified).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {response && (
                      <div>
                        <p>{response.message}</p>
                        {response.data && <pre>{JSON.stringify(response.data, null, 2)}</pre>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* To download again we need a blob url */}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        const url = URL.createObjectURL(file);
                        window.open(url, "_blank");
                        setTimeout(() => URL.revokeObjectURL(url), 3000);
                      }}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {files.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No files selected
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </main>
      </div>

      {/* “Add collection” dialog */}
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
              placeholder="e.g. Invoices"
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