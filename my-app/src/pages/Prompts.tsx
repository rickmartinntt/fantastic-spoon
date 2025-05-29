import { useState, useEffect, useRef } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
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
import { ArrowUp, ArrowDown, X, Download, Expand } from "lucide-react";

/* ──────────── types ──────────── */

type DataType =
  | "text"
  | "date"
  | "datetime"
  | "currency"
  | "number"
  | "integer"
  | "float"
  | "percentage"
  | "boolean"
  | "summary(50 words)"
  | "summary(100 words)"
  | "list"
  | "json";

interface FieldBlock {
  fieldName: string;
  prompt: string;
  dataType: DataType;
}

/* ─── auto-sizing textarea ─── */
function AutoSizeTextarea({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // grow on each value change (initial + edits)
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }, [value]);

  // when user types, resize immediately then propagate change
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const ta = ref.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
    onChange(e);
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleChange}
      className={`${className ?? ""} resize-none overflow-hidden`}
    />
  );
}

/* ─────────── constants ─────────── */

const DATA_TYPE_OPTIONS: { value: DataType; label: string }[] = [
  { value: "text",             label: "Text (1–2 sentences)" },
  { value: "date",             label: "Date (YYYY-MM-DD)" },
  { value: "datetime",         label: "DateTime (ISO 8601)" },
  { value: "currency",         label: "Currency (e.g. $123.45)" },
  { value: "number",           label: "Number (no units)" },
  { value: "integer",          label: "Integer (no units)" },
  { value: "float",            label: "Float (no units)" },
  { value: "percentage",       label: "Percentage (e.g. 12.5%)" },
  { value: "boolean",          label: "Boolean (true/false)" },
  { value: "summary(50 words)",  label: "Summary (up to 50 words)" },
  { value: "summary(100 words)", label: "Summary (up to 100 words)" },
  { value: "list",             label: "List (JSON array of items)" },
  { value: "json",             label: "JSON object (standalone)" },
];

const DB_NAME        = "Loan Participation";
const CONTAINER_NAME = "Queries";
const DOC_ID         = "Queries";

const EMPTY_FIELD: FieldBlock = {
  fieldName: "",
  prompt:    "",
  dataType:  "text",
};

const FIELDS_PER_PAGE = 5;

/* ─────────── API helpers ─────────── */

async function fetchDocument(): Promise<{
  id?: string;
  documentType: string;
  fields: { fieldName: string; extractionPrompt: string; dataType: DataType }[];
}> {
  const url = `/api/items/${encodeURIComponent(CONTAINER_NAME)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  if (!Array.isArray(data)) return data;
  const doc = data.find((d) => d.id === DOC_ID);
  if (!doc) throw new Error(`Document "${DOC_ID}" not found`);
  return doc;
}

async function upsertDocument(body: any) {
  const url = `/api/items/${encodeURIComponent(CONTAINER_NAME)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/* ───────────── component ───────────── */

export default function PromptsPage() {
  const qc = useQueryClient();

  /* fixed selectors */
  const [database]  = useState(DB_NAME);
  const [container] = useState(CONTAINER_NAME);

  /* dynamic state */
  const [documentType, setDocumentType] = useState("");
  const [fields, setFields] = useState<FieldBlock[]>([{ ...EMPTY_FIELD }]);

  /* modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFieldIdx, setModalFieldIdx] = useState<number | null>(null);

  /* pagination */
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(fields.length / FIELDS_PER_PAGE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  /* fetch on mount */
  const { data: doc, isFetching, isError, error } = useQuery({
    queryKey: ["cosmosDoc", DOC_ID],
    queryFn: fetchDocument,
    staleTime: Infinity,
  });

  /* populate when doc arrives */
  useEffect(() => {
    if (!doc) return;
    setDocumentType(doc.documentType);
    setFields(
      (doc.fields ?? []).map((f) => ({
        fieldName: f.fieldName,
        prompt:    f.extractionPrompt,
        dataType:  f.dataType,
      }))
    );
    setPage(1);
  }, [doc]);

  useEffect(() => {
    if (isError && error instanceof Error) {
      alert(error.message);
    }
  }, [isError, error]);

  /* save/upsert */
  const saveMutation = useMutation({
    mutationFn: (body: any) => upsertDocument(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cosmosDoc", DOC_ID] });
      alert("Saved!");
    },
    onError: (err: any) => alert(err.message || "Save failed"),
  });

  /* field helpers */
  const updateField = <K extends keyof FieldBlock>(
    i: number,
    k: K,
    v: FieldBlock[K]
  ) => setFields((prev) =>
    prev.map((f, idx) => (idx === i ? { ...f, [k]: v } : f))
  );

  const addField = () => {
    setFields((prev) => {
      const next = [...prev, { ...EMPTY_FIELD }];
      setPage(Math.ceil(next.length / FIELDS_PER_PAGE));
      return next;
    });
  };
  const deleteField = (i: number) => setFields((prev) => prev.filter((_, idx) => idx !== i));
  const moveField = (from: number, to: number) => {
    setFields((prev) => {
      const a = [...prev];
      [a[from], a[to]] = [a[to], a[from]];
      return a;
    });
  };
  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(fields, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "field-config.json";
    a.click();
  };

  const makeCosmosBody = () => ({
    id: DOC_ID,
    documentType,
    fields: fields.map((f) => ({
      fieldName:        f.fieldName,
      extractionPrompt: f.prompt,
      dataType:         f.dataType,
    })),
  });

  /* pagination slice */
  const firstIdx   = (page - 1) * FIELDS_PER_PAGE;
  const pageFields = fields.slice(firstIdx, firstIdx + FIELDS_PER_PAGE);

  /* ───────────── render ───────────── */
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10 space-y-6">
      {/* ─── HEADER ─── */}
      <div className="border bg-gray-100 rounded p-3 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-sm">Database</Label>
            <Select value={database} disabled>
              <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value={DB_NAME}>{DB_NAME}</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Container</Label>
            <Select value={container} disabled>
              <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value={CONTAINER_NAME}>{CONTAINER_NAME}</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Document Type</Label>
            <Input
              className="h-8"
              placeholder="Participation Agreement"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            />
          </div>
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
        {isFetching && <p className="text-xs text-gray-600 pt-1">Loading…</p>}
      </div>

      {/* ─── FIELD EDITOR ─── */}
      <h1 className="text-2xl font-semibold">Prompt List</h1>
      {pageFields.map((f, idxOnPage) => {
        const idx = firstIdx + idxOnPage;
        return (
          <div key={idx} className="mb-3 rounded-md border p-2 shadow-sm">
            {/* 6-column grid */}
            <div className="grid grid-cols-6 gap-2 items-start">
              
              {/* 1) Field Name (col-span 1) */}
              <div className="col-span-1">
                <Label className="text-xs">Field Name</Label>
                <Input
                  className="h-8 w-full"
                  value={f.fieldName}
                  onChange={e => updateField(idx, "fieldName", e.target.value)}
                />
              </div>
              
              {/* 2) Prompt (col-span 3, autosize + expand) */}
              <div className="col-span-3 relative">
                <Label className="text-xs">Prompt</Label>
                <AutoSizeTextarea
                  className="w-full p-1 border rounded text-sm"
                  value={f.prompt}
                  onChange={e => updateField(idx, "prompt", e.target.value)}
                />
                <button
                  type="button"
                  className="absolute top-6 right-1 text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setModalFieldIdx(idx);
                    setModalOpen(true);
                  }}
                >
                  <Expand size={16} />
                </button>
              </div>
              
              {/* 3) Data Type (col-span 1) */}
              <div className="col-span-1">
                <Label className="text-xs">Data Type</Label>
                <Select
                  value={f.dataType}
                  onValueChange={(v: DataType) => updateField(idx, "dataType", v)}
                >
                  <SelectTrigger className="h-8 w-full bg-white">
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {DATA_TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 4) Actions (col-span 1) */}
              <div className="col-span-1 flex gap-1 justify-end">
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


      {/* pagination */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="h-8 px-3"
        >
          Previous
        </Button>
        <span className="text-sm">Page {page} / {totalPages}</span>
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

      {/* ─── PROMPT EDIT MODAL ─── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogTrigger asChild></DialogTrigger>
        <DialogContent className="bg-white backdrop-blur-sm max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
          </DialogHeader>
          <AutoSizeTextarea
            className="w-full p-2 border rounded"
            minRows={4}
            value={modalFieldIdx !== null ? fields[modalFieldIdx].prompt : ""}
            onChange={(e) =>
              modalFieldIdx !== null &&
              updateField(modalFieldIdx, "prompt", e.target.value)
            }
          />
          <div className="flex justify-end mt-4">
            <Button onClick={() => setModalOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}