import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Progress } from "../components/ui/progress";   
import { useAzureBlobUpload } from "../hooks/useAzureBlobUpload";

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
  useEffect(() => {
    saveCollections(collections);
  }, [collections]);
  
  const addCollection = () => {
      if (!newCollection.trim()) return;
      const updated = Array.from(new Set([...collections, newCollection.trim()]));
      setCollections(updated);
      setCurrentCollection(newCollection.trim());
      setNewCollection("");
      setShowAddDialog(false);
  };

  /* permissions ---------------------------------------------------------- */
  const permissionOptions = ["Private", "Org-Wide", "Public"];
  const [permission, setPermission] = useState(permissionOptions[0]);

  /* files ---------------------------------------------------------------- */
  const [files, setFiles] = useState<File[]>([]);
  const { uploading, items, uploadFiles, update } = useAzureBlobUpload();



  /* handlers ------------------------------------------------------------- */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
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
                <TableHead>Size</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status / Progress</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.map((it) => (
                <TableRow key={it.file.name + it.file.lastModified}>
                  <TableCell>{currentCollection}</TableCell>
                  <TableCell>{it.file.name}</TableCell>
                  <TableCell>{(it.file.size / 1024).toFixed(1)} KB</TableCell>
                  <TableCell>
                    {new Date(it.file.lastModified).toLocaleDateString()}
                  </TableCell>

                  {/* progress & message */}
                  <TableCell className="w-56">
                    {it.status === "uploading" && (
                      <>
                        <Progress value={it.progress} className="h-2 mb-1" />
                        <span className="text-sm text-gray-500">
                          {it.progress} %
                        </span>
                      </>
                    )}

                    {it.status === "success" && (
                      <span className="text-green-600">{it.message}</span>
                    )}

                    {it.status === "error" && (
                      <span className="text-red-600">{it.message}</span>
                    )}
                  </TableCell>

                  {/* link */}
                  <TableCell>
                    {it.url && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => window.open(it.url, "_blank")}
                      >
                        Open
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
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