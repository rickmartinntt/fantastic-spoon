import { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ArrowUp, ArrowDown, X, Download } from "lucide-react";

/* ──────────── types ──────────── */

type DataType =
  | "text"
  | "date"
  | "number"
  | "currency"
  | "summary50"
  | "summary100"
  | "object";

interface FieldBlock {
  fieldName: string;
  prompt: string;
  dataType: DataType;
}

/* Format stored in Cosmos */
interface CosmosDocument {
  id?: string;
  documentType: string;
  fields: {
    fieldName: string;
    extractionPrompt: string;
    dataType: DataType;
  }[];
}

/* ─────────── constants ─────────── */

const DB_NAME        = "Loan Participation";
const CONTAINER_NAME = "Queries";
const DOC_ID         = "Queries";

const DATA_TYPE_OPTIONS: { value: DataType; label: string }[] = [
  { value: "text",       label: "Text" },
  { value: "date",       label: "Date" },
  { value: "number",     label: "Number" },
  { value: "currency",   label: "Currency" },
  { value: "summary50",  label: "Summary (<50 words)" },
  { value: "summary100", label: "Summary (<100 words)" },
  { value: "object",     label: "Object" },
];

const EMPTY_FIELD: FieldBlock = {
  fieldName: "",
  prompt:    "",
  dataType:  "text",
};

/* How many Field Blocks per page */
const FIELDS_PER_PAGE = 5;

/* ─────────── API helpers ─────────── */

/* GET  /api/items/:container (returns array) */
async function fetchDocument(): Promise<CosmosDocument> {
  const url = `/api/items/${encodeURIComponent(CONTAINER_NAME)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());

  const data = await res.json();

  /* container returns single object? */
  if (!Array.isArray(data)) return data as CosmosDocument;

  const doc = data.find((d: CosmosDocument) => d.id === DOC_ID);
  if (!doc)
    throw new Error(
      `Document "${DOC_ID}" not found in container "${CONTAINER_NAME}".`,
    );

  return doc;
}

/* POST /api/items/:container  (upsert) */
async function upsertDocument(body: CosmosDocument): Promise<CosmosDocument> {
  const url = `/api/items/${encodeURIComponent(CONTAINER_NAME)}`;
  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ───────────── component ───────────── */

export default function PromptsPage() {
  const qc = useQueryClient();

  /* database + container selectors (single option each) */
  const [database]  = useState(DB_NAME);
  const [container] = useState(CONTAINER_NAME);

  /* metadata + field state */
  const [documentType, setDocumentType] = useState("");
  const [fields, setFields] = useState<FieldBlock[]>([{ ...EMPTY_FIELD }]);

  /* pagination */
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(fields.length / FIELDS_PER_PAGE));

  /* keep page in range when fields are added / removed */
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  /* ── initial load ── */
  const {
    data: doc,
    isFetching,
    isError,
    error,
  } = useQuery<CosmosDocument>({
    queryKey : ["cosmosDoc", DOC_ID],
    queryFn  : fetchDocument,
    staleTime: Infinity,
  });

  /* populate local state when data arrives */
  useEffect(() => {
    if (!doc) return;
    setDocumentType(doc.documentType ?? "");
    setFields(
      (doc.fields ?? []).map((f) => ({
        fieldName: f.fieldName,
        prompt:    f.extractionPrompt,
        dataType:  f.dataType,
      })),
    );
    setPage(1);             // go to first page on load
  }, [doc]);

  /* show load error */
  useEffect(() => {
    if (isError && error instanceof Error) {
      alert(error.message ?? "Failed to load");
    }
  }, [isError, error]);

  /* ── save / upsert ── */
  const saveMutation = useMutation({
    mutationFn: (body: CosmosDocument) => upsertDocument(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cosmosDoc", DOC_ID] });
      alert("Saved!");
    },
    onError: (err: any) => alert(err.message ?? "Save failed"),
  });

  /* ── helpers ── */
  const updateField =
    <K extends keyof FieldBlock>(i: number, k: K, v: FieldBlock[K]) =>
      setFields((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, [k]: v } : f))
      );

  const addField = () =>
    setFields((prev) => {
      const next = [...prev, { ...EMPTY_FIELD }];
      /* after adding, jump to the last page so the new item is visible */
      setPage(Math.ceil(next.length / FIELDS_PER_PAGE));
      return next;
    });

  const deleteField = (idx: number) =>
    setFields((prev) => prev.filter((_, i) => i !== idx));

  const moveField = (from: number, to: number) =>
    setFields((prev) => {
      const arr = [...prev];
      [arr[from], arr[to]] = [arr[to], arr[from]];
      return arr;
    });

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(fields, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "field-config.json";
    a.click();
  };

  /* body we send to Cosmos – id is the same constant we loaded */
  const makeCosmosBody = (): CosmosDocument => ({
    id: DOC_ID,
    documentType,
    fields: fields.map((f) => ({
      fieldName:        f.fieldName,
      extractionPrompt: f.prompt,
      dataType:         f.dataType,
    })),
  });

  /* which slice of fields to render on current page */
  const firstIdx = (page - 1) * FIELDS_PER_PAGE;
  const pageFields = fields.slice(firstIdx, firstIdx + FIELDS_PER_PAGE);

  /* ───────────── render ───────────── */
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">

      {/* header / meta */}
      <div className="border border-black bg-gray-100 rounded-md p-3 space-y-3">
        <div className="flex flex-wrap items-end gap-3">

          {/* Database dropdown (disabled) */}
          <div>
            <Label className="text-sm">Database</Label>
            <Select value={database} disabled>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={DB_NAME}>{DB_NAME}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Container dropdown (disabled) */}
          <div>
            <Label className="text-sm">Container</Label>
            <Select value={container} disabled>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={CONTAINER_NAME}>{CONTAINER_NAME}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Document type */}
          <div>
            <Label className="text-sm">Document Type</Label>
            <Input
              className="h-8"
              placeholder="Participation Agreement"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            />
          </div>

          {/* Save button */}
          <div className="mt-4">
            <Button
              onClick={() => saveMutation.mutate(makeCosmosBody())}
              className="bg-green-600 hover:bg-green-700 text-white h-8 px-4"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
        {isFetching && (
          <p className="text-xs text-gray-600 pt-1">Loading…</p>
        )}
      </div>

      {/* field editor */}
      <h1 className="text-2xl font-semibold">Field Blocks</h1>

      {pageFields.map((f, idxOnPage) => {
        const idx = firstIdx + idxOnPage;   // real index in full list
        return (
          <div
            key={idx}
            className="mb-3 rounded-md border p-2 shadow-sm"
          >
            <div className="grid gap-2 md:grid-cols-4 items-end">
              {/* Field Name */}
              <div>
                <Label className="text-xs">Field Name</Label>
                <Input
                  className="h-8"
                  value={f.fieldName}
                  onChange={(e) => updateField(idx, "fieldName", e.target.value)}
                />
              </div>

              {/* Prompt */}
              <div>
                <Label className="text-xs">Prompt</Label>
                <Input
                  className="h-8"
                  value={f.prompt}
                  onChange={(e) => updateField(idx, "prompt", e.target.value)}
                />
              </div>

              {/* Data Type */}
              <div>
                <Label className="text-xs">Data Type</Label>
                <Select
                  value={f.dataType}
                  onValueChange={(v: DataType) => updateField(idx, "dataType", v)}
                >
                 <SelectTrigger className="h-8 bg-white">
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {DATA_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* move / delete */}
              <div className="flex gap-1 justify-end">
                {idx > 0 && (
                  <Button
                    size="icon"
                    className="bg-blue-500 hover:bg-blue-600 text-white h-8 w-8"
                    onClick={() => moveField(idx, idx - 1)}
                  >
                    <ArrowUp size={14} />
                  </Button>
                )}
                {idx < fields.length - 1 && (
                  <Button
                    size="icon"
                    className="bg-blue-500 hover:bg-blue-600 text-white h-8 w-8"
                    onClick={() => moveField(idx, idx + 1)}
                  >
                    <ArrowDown size={14} />
                  </Button>
                )}
                <Button
                  size="icon"
                  className="bg-red-500 hover:bg-red-600 text-white h-8 w-8"
                  onClick={() => deleteField(idx)}
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {/* pagination controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="h-8 px-3"
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {page} / {totalPages}
        </span>
        <Button
          variant="secondary"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="h-8 px-3"
        >
          Next
        </Button>
      </div>

      {/* global buttons */}
      <div className="flex gap-3 pt-2">
        <Button onClick={addField} className="h-8">
          Add another field
        </Button>
        <Button
          variant="secondary"
          onClick={downloadJSON}
          disabled={!fields.length}
          className="h-8"
        >
          <Download className="mr-2 h-4 w-4" /> Download JSON
        </Button>
      </div>
    </div>
  );
}