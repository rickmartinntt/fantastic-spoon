import React, { useCallback, useEffect, useRef, useState } from "react";
import { listBlobs, useAzureBlobUpload } from "../hooks/useAzureBlobUpload";
import type { ExistingBlob, UploadInfo } from "../hooks/useAzureBlobUpload";
import FileViewerModal from "../components/ui/fileviewer";
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
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

// ---------------------------------------------
// API‐fetch helpers

export interface Persona {
  id: string;
  personaID: string;
  personaName: string;
  personaText: string;
}

export interface QuerySet {
  id?: string;
  documentType: string;
  fields: {
    fieldName: string;
    extractionPrompt: string;
    dataType: string;
  }[];
}

async function fetchPersonas(): Promise<Persona[]> {
  const res = await fetch("/api/personas");
  if (!res.ok) throw new Error(`Failed to load personas: ${await res.text()}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid personas payload");
  return data;
}

async function fetchQuerySets(): Promise<QuerySet[]> {
  const res = await fetch("/api/querySets");
  if (!res.ok) throw new Error(`Failed to load query sets: ${await res.text()}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Invalid querySets payload");
  return data;
}

// ---------------------------------------------
// Main component

export default function UploadPage() {
  // dropdown data
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [querySets, setQuerySets] = useState<QuerySet[]>([]);
  // selected values
  const [selectedPersona, setSelectedPersona] = useState<string>("");
  const [selectedQuerySet, setSelectedQuerySet] = useState<string>("");

  // permissions dropdown
  const permissionOptions = ["Private", "Org-Wide", "Public"] as const;
  const [permission, setPermission] = useState<typeof permissionOptions[number]>(
    permissionOptions[0]
  );

  // file picker
  const [files, setFiles] = useState<File[]>([]);

  // storage hook
  const { uploading, items, uploadFiles } = useAzureBlobUpload();

  // rows already in blob storage
  const [stored, setStored] = useState<UploadInfo[]>([]);

  // pagination
  const ROWS_PER_PAGE = 10;
  const [page, setPage] = useState(1);

  // viewer
  const [viewerFile, setViewerFile] = useState<{
    url: string;
    fileName: string;
  } | null>(null);

  // build container name from the two selections
  const containerName = `${selectedPersona}-${selectedQuerySet}`;

  // ── Load dropdowns on mount
  useEffect(() => {
    fetchPersonas()
      .then((list) => {
        setPersonas(list);
        if (list.length) setSelectedPersona(list[0].personaID);
      })
      .catch(console.error);

    fetchQuerySets()
      .then((list) => {
        setQuerySets(list);
        if (list.length) setSelectedQuerySet(list[0].documentType);
      })
      .catch(console.error);
  }, []);

  // ── convert an ExistingBlob → UploadInfo
  const blobToRow = useCallback(
    (b: ExistingBlob): UploadInfo => ({
      collection: containerName,
      permission: undefined,
      file: new File([], b.name),
      progress: 100,
      status: "success",
      url: b.url,
      message: "Uploaded",
    }),
    [containerName]
  );

  // ── load blobs for the current container
  const loadContainer = useCallback(async () => {
    if (!selectedPersona || !selectedQuerySet) return;
    try {
      const blobs = await listBlobs(containerName);
      setStored((prev) => [
        // filter out old rows from the same container
        ...prev.filter((r) => r.collection !== containerName),
        // append fresh
        ...blobs.map(blobToRow),
      ]);
    } catch (err) {
      console.error(err);
    }
  }, [blobToRow, containerName, selectedPersona, selectedQuerySet]);

  // avoid reloading same container twice
  const loaded = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!containerName || loaded.current.has(containerName)) return;
    loadContainer().then(() => loaded.current.add(containerName));
  }, [containerName, loadContainer]);

  // reset page when container or row‐counts change
  useEffect(() => setPage(1), [
    containerName,
    stored.length,
    items.length,
  ]);

  // ── file picker handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  // ── upload handler
  const handleUpload = async () => {
    if (!selectedPersona || !selectedQuerySet) return;
    await uploadFiles(containerName, files, permission);
    await loadContainer();
    setFiles([]);
  };

  // ── derive rows & pagination
  const allRows = [...stored, ...items];
  const totalPages = Math.max(1, Math.ceil(allRows.length / ROWS_PER_PAGE));
  const firstIdx = (page - 1) * ROWS_PER_PAGE;
  const pageRows = allRows.slice(firstIdx, firstIdx + ROWS_PER_PAGE);

  // ───────────────────────────────────────── render
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-72 shrink-0 border-r p-6 space-y-6">
          {/* file input */}
          <div className="space-y-2">
            <Label htmlFor="fileInput">Choose files</Label>
            <Input
              id="fileInput"
              type="file"
              multiple
              onChange={handleFileChange}
            />
            <Button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
            >
              {uploading ? "Uploading…" : "Upload Files"}
            </Button>
          </div>

          {/* Persona dropdown */}
          <div className="space-y-2">
            <Label>Persona</Label>
            <Select
              value={selectedPersona}
              onValueChange={setSelectedPersona}
              disabled={personas.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select persona" />
              </SelectTrigger>
              <SelectContent>
                {personas.map((p) => (
                  <SelectItem key={p.personaID} value={p.personaID}>
                    {p.personaName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Query Set dropdown */}
          <div className="space-y-2">
            <Label>Query Set</Label>
            <Select
              value={selectedQuerySet}
              onValueChange={setSelectedQuerySet}
              disabled={querySets.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select query set" />
              </SelectTrigger>
              <SelectContent>
                {querySets.map((q) => (
                  <SelectItem key={q.documentType} value={q.documentType}>
                    {q.documentType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permission dropdown */}
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

        {/* RIGHT MAIN TABLE */}
        <main className="flex-1 overflow-auto p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Query Set</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row, idx) => {
                // split container => persona/querySet
                const [personaID, querySetID] =
                  row.collection.split("-");
                const personaName =
                  personas.find((p) => p.personaID === personaID)?.personaName ||
                  personaID;
                return (
                  <TableRow key={`${row.collection}-${idx}-${row.file.name}`}>
                    <TableCell>{personaName}</TableCell>
                    <TableCell>{querySetIDdoc}</TableCell>
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
                          <Progress
                            value={row.progress}
                            className="h-2 mb-1"
                          />
                          <span className="text-sm text-gray-500">
                            {row.progress}%
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
                          onClick={() =>
                            setViewerFile({
                              url: row.url!,
                              fileName: row.file.name,
                            })
                          }
                        >
                          View File
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {allRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No files uploaded yet
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
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
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

      {/* FILE VIEWER MODAL */}
      {viewerFile && (
        <FileViewerModal
          open={!!viewerFile}
          onOpenChange={(open) => {
            if (!open) setViewerFile(null);
          }}
          url={viewerFile.url}
          fileName={viewerFile.fileName}
        />
      )}
    </div>
  );
}