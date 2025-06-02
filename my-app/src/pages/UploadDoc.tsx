// src/pages/uploaddoc.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { listBlobs, useAzureBlobUpload } from "../hooks/useAzureBlobUpload";
import type { ExistingBlob, UploadInfo } from "../hooks/useAzureBlobUpload";

import FileViewerModal from "../components/ui/fileviewer";
import { Progress }     from "../components/ui/progress";
import { Button }       from "../components/ui/button";
import { Input }        from "../components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";

/* ─── API helpers ───────────────────────────────────────────────── */
export interface Persona  { id: string; personaID: string; personaName: string; personaText: string; }
export interface QuerySet { id?: string; documentType: string; fields: { fieldName: string; extractionPrompt: string; dataType: string; }[]; }

async function fetchPersonas (): Promise<Persona[]> {
  const res = await fetch("/api/items/Personas");
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function fetchQuerySets (): Promise<QuerySet[]> {
  const res = await fetch("/api/items/Queries");
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

/* ─── component ─────────────────────────────────────────────────── */
export default function UploadPage() {
  /* dropdown data */
  const [personas,   setPersonas]   = useState<Persona[]>([]);
  const [querySets,  setQuerySets]  = useState<QuerySet[]>([]);

  /* selected values */
  const [selectedPersona,  setSelectedPersona]  = useState<string>("");
  const [selectedQuerySet, setSelectedQuerySet] = useState<string>("");

  /* permission */
  const permissionOptions = ["Private", "Org-Wide", "Public"] as const;
  const [permission, setPermission] =
    useState<typeof permissionOptions[number]>("Private");

  /* user-selected files */
  const [files, setFiles] = useState<File[]>([]);

  /* Azure-storage hook */
  const { uploading, items, uploadFiles } = useAzureBlobUpload();

  /* blobs already uploaded for this persona + docType */
  const [stored, setStored] = useState<UploadInfo[]>([]);

  /* pagination */
  const ROWS_PER_PAGE = 10;
  const [page, setPage] = useState(1);

  /* viewer */
  const [viewerFile, setViewerFile] = useState<{ url: string; fileName: string }|null>(null);

  /* ─── load dropdowns on mount ─────────────────────────────────── */
  useEffect(() => {
    fetchPersonas().then(list => {
      setPersonas(list);
      if (list.length) setSelectedPersona(list[0].personaID);
    }).catch(console.error);

    fetchQuerySets().then(list => {
      setQuerySets(list);
      if (list.length) setSelectedQuerySet(list[0].documentType);
    }).catch(console.error);
  }, []);

  /* convert one blob (with metadata) → UploadInfo */
  const blobToRow = useCallback(
    (b: ExistingBlob): UploadInfo => ({
      file: new File([], b.name),
      progress: 100,
      status: "success",
      url: b.url,
      message: "Uploaded",
      permission: b.permission as UploadInfo["permission"],
      docType:   b.docType,
      persona:   b.persona,
    }),
    [],
  );

  /* load blobs for current selection */
  const loadCurrent = useCallback(async () => {
    if (!selectedPersona || !selectedQuerySet) return;

    try {
      const blobs = await listBlobs();

      const relevant = blobs.filter(b =>
        b.persona === selectedPersona && b.docType === selectedQuerySet);

      setStored(relevant.map(blobToRow));
    } catch (err) { console.error(err); }
  }, [selectedPersona, selectedQuerySet, blobToRow]);

  /* avoid re-loading when nothing changed */
  const loaded = useRef<Set<string>>(new Set());
  const key    = `${selectedPersona}-${selectedQuerySet}`;
  useEffect(() => {
    if (!selectedPersona || !selectedQuerySet) return;
    if (loaded.current.has(key)) return;

    loadCurrent().then(() => loaded.current.add(key));
  }, [key, loadCurrent, selectedPersona, selectedQuerySet]);

  /* reset page when rows change */
  useEffect(() => setPage(1), [stored.length, items.length, key]);

  /* file-picker */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  /* upload */
  const handleUpload = async () => {
    if (!selectedPersona || !selectedQuerySet || files.length === 0) return;

    await uploadFiles(files, permission, selectedQuerySet, selectedPersona);
    await loadCurrent();
    setFiles([]);
  };

  /* pagination helpers */
  const allRows     = [...stored, ...items];           // current container only
  const totalPages  = Math.max(1, Math.ceil(allRows.length / ROWS_PER_PAGE));
  const firstIdx    = (page - 1) * ROWS_PER_PAGE;
  const pageRows    = allRows.slice(firstIdx, firstIdx + ROWS_PER_PAGE);

  /* ─────────────────────────────── render */
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* ─────────── LEFT SIDEBAR ─────────── */}
        <aside className="w-72 shrink-0 border-r p-6 space-y-6">
          {/* file input */}
          <div className="space-y-2">
            <Label htmlFor="fileInput">Choose files</Label>
            <Input id="fileInput" type="file" multiple onChange={handleFileChange}/>
            <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
              {uploading ? "Uploading…" : "Upload Files"}
            </Button>
          </div>

          {/* persona */}
          <div className="space-y-2">
            <Label>Persona</Label>
            <Select value={selectedPersona} onValueChange={setSelectedPersona}
                    disabled={personas.length === 0}>
              <SelectTrigger><SelectValue placeholder="Select persona" /></SelectTrigger>
              <SelectContent>
                {personas.map(p => (
                  <SelectItem key={p.personaID} value={p.personaID}>{p.personaName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* query set */}
          <div className="space-y-2">
            <Label>Query Set</Label>
            <Select value={selectedQuerySet} onValueChange={setSelectedQuerySet}
                    disabled={querySets.length === 0}>
              <SelectTrigger><SelectValue placeholder="Select query set" /></SelectTrigger>
              <SelectContent>
                {querySets.map(q => (
                  <SelectItem key={q.documentType} value={q.documentType}>{q.documentType}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* permission */}
          <div className="space-y-2">
            <Label>Permissions</Label>
            <Select value={permission} onValueChange={setPermission}>
              <SelectTrigger><SelectValue placeholder="Select permission"/></SelectTrigger>
              <SelectContent>
                {permissionOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </aside>

        {/* ─────────── RIGHT MAIN ─────────── */}
        <main className="flex-1 overflow-auto p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Query Set</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status / Progress</TableHead>
                <TableHead>Link</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {pageRows.map((row, idx) => {
                const personaName =
                  personas.find(p => p.personaID === row.persona)?.personaName
                  ?? row.persona ?? "-";

                return (
                  <TableRow key={`${idx}-${row.file.name}`}>
                    <TableCell>{personaName}</TableCell>
                    <TableCell>{row.docType}</TableCell>
                    <TableCell>{row.file.name}</TableCell>
                    <TableCell>{(row.file.size / 1024).toFixed(1)} KB</TableCell>

                    <TableCell className="w-56">
                      {row.status === "uploading" && (
                        <>
                          <Progress value={row.progress} className="h-2 mb-1"/>
                          <span className="text-sm text-gray-500">{row.progress}%</span>
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
                        <Button variant="link" size="sm"
                                onClick={() => setViewerFile({ url: row.url!, fileName: row.file.name })}>
                          View File
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {allRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No files uploaded yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* pagination */}
          {allRows.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <Button variant="outline" size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}>
                Prev
              </Button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                Next
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* viewer modal */}
      {viewerFile && (
        <FileViewerModal
          open={!!viewerFile}
          onOpenChange={o => !o && setViewerFile(null)}
          url={viewerFile.url}
          fileName={viewerFile.fileName}
        />
      )}
    </div>
  );
}