// src/pages/Query.tsx
import { useEffect, useRef, useState, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listBlobs } from "../hooks/useAzureBlobUpload";

import { Button }   from "../components/ui/button";
import { Input }    from "../components/ui/input";
import { Label }    from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "../components/ui/select";
import { Expand, ArrowUp, ArrowDown, X, Download } from "lucide-react";

/* ─── auto-growing textarea ───────────────────────────────────── */
function AutoSizeTextarea({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // grow / shrink when value changes
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }, [value]);

  const handle = (e: ChangeEvent<HTMLTextAreaElement>) => {
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
      onChange={handle}
      className={`resize-none overflow-hidden ${className}`}
    />
  );
}

/* ─── Types ───────────────────────────────────────────────────── */
interface ResultField {
  fieldName:        string;
  extractionPrompt: string;
  answer:           string;
  timeStamp:        string;
  // dataType removed
}

interface ResultsDocument {
  id:            string;
  documentName:  string;
  documentSize:  number;
  timeImported:  string;
  fields:        ResultField[];
  persona?:      string;
  docType?:      string;
  permission?:   string;
}

interface FieldBlock {
  fieldName: string;
  prompt:    string;
  answer:    string;
  timeStamp: string;
}

/* ─── constants / helpers ─────────────────────────────────────── */
const DB_NAME         = "Loan Participation";
const CONTAINER_NAME  = "Results";
const FIELDS_PER_PAGE = 5;

const EMPTY_FIELD: FieldBlock = {
  fieldName: "", prompt: "", answer: "", timeStamp: "",
};

async function fetchAllResults(): Promise<ResultsDocument[]> {
  const res = await fetch(`/api/items/${encodeURIComponent(CONTAINER_NAME)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function upsertResultsDoc(body: ResultsDocument) {
  const res = await fetch(`/api/items/${encodeURIComponent(CONTAINER_NAME)}`, {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function formatTimestamp(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ─── component ───────────────────────────────────────────────── */
export default function ResultsPage() {
  const qc = useQueryClient();

  /* immutable selectors */
  const [database]  = useState(DB_NAME);
  const [container] = useState(CONTAINER_NAME);

  /* fetch every document */
  const { data: allDocs = [], isFetching: isLoadingDocs } =
    useQuery<ResultsDocument[]>({
      queryKey : ["allResults"],
      queryFn  : fetchAllResults,
      staleTime: Infinity,
    });

  /* selected document + meta */
  const [selectedId,   setSelectedId]   = useState("");
  const [documentName, setDocumentName] = useState("");
  const [persona,      setPersona]      = useState("");
  const [docType,      setDocType]      = useState("");
  const [permission,   setPermission]   = useState("");

  const [fields, setFields] = useState<FieldBlock[]>([EMPTY_FIELD]);

  /* pagination */
  const [page, setPage] = useState(1);

  /* filters (dataType removed) */
  const [filterFieldName,  setFilterFieldName]  = useState("");
  const [filterPrompt,     setFilterPrompt]     = useState("");
  const [filterAnswerText, setFilterAnswerText] = useState("");
  const [filterTime,       setFilterTime]       = useState("");
  const [answerMode,       setAnswerMode]       = useState<"ALL" | "ANSWERED" | "NOT_ANSWERED">("ALL");

  /* modal for textarea expand */
  const [modalOpen,      setModalOpen]      = useState(false);
  const [modalFieldIdx,  setModalFieldIdx]  = useState<number | null>(null);
  const [modalKey,       setModalKey]       = useState<"prompt" | "answer">("prompt");

  /* when a document is chosen */
  useEffect(() => {
    if (!selectedId) return;
    const doc = allDocs.find(d => d.id === selectedId);
    if (!doc) return;

    setDocumentName(doc.documentName);
    setPersona   (doc.persona    ?? "");
    setDocType   (doc.docType    ?? "");
    setPermission(doc.permission ?? "");

    setFields((doc.fields ?? []).map(f => ({
      fieldName: f.fieldName,
      prompt:    f.extractionPrompt,
      answer:    f.answer,
      timeStamp: f.timeStamp,
    })));

    /* attempt to supplement metadata from blob */
    if (!doc.persona || !doc.docType || !doc.permission) {
      (async () => {
        try {
          const blobs   = await listBlobs();
          const related = blobs.find(b => b.name === doc.documentName);
          if (!related) return;
          setPersona   (p => p || related.persona    || "");
          setDocType   (d => d || related.docType    || "");
          setPermission(p => p || related.permission || "");
        } catch { /* ignore */ }
      })();
    }

    /* reset filters & page */
    setFilterFieldName(""); setFilterPrompt(""); setFilterAnswerText("");
    setFilterTime(""); setAnswerMode("ALL"); setPage(1);
  }, [selectedId, allDocs]);

  /* save */
  const saveMutation = useMutation({
    mutationFn: upsertResultsDoc,
    onSuccess : () => { qc.invalidateQueries({ queryKey: ["allResults"] }); alert("Saved!"); },
    onError   : (err: any) => alert(err.message ?? "Save failed"),
  });

  const makeCosmosBody = (): ResultsDocument => ({
    id           : selectedId || crypto.randomUUID(),
    documentName,
    documentSize : 0,
    timeImported : new Date().toISOString(),
    persona, docType, permission,
    fields       : fields.map(f => ({
      fieldName        : f.fieldName,
      extractionPrompt : f.prompt,
      answer           : f.answer,
      timeStamp        : f.timeStamp || new Date().toISOString(),
    })),
  });

  /* helpers */
  const updateField =
    <K extends keyof FieldBlock>(i: number, k: K, v: FieldBlock[K]) =>
      setFields(prev => prev.map((f, idx) => (idx === i ? { ...f, [k]: v } : f)));

  const moveField = (from: number, to: number) =>
    setFields(p => { const a = [...p]; [a[from], a[to]] = [a[to], a[from]]; return a; });

  const deleteField = (i: number) =>
    setFields(p => p.filter((_, idx) => idx !== i));

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(fields, null, 2)], { type: "application/json" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = "results-fields.json";
    a.click();
  };

  /* filtering */
  function filteredFields(src = fields) {
    return src.filter(f => {
      if (filterFieldName && !f.fieldName.toLowerCase().includes(filterFieldName.toLowerCase())) return false;
      if (filterPrompt    && !f.prompt   .toLowerCase().includes(filterPrompt   .toLowerCase())) return false;
      if (filterTime      && !f.timeStamp.toLowerCase().includes(filterTime     .toLowerCase())) return false;

      if (answerMode === "NOT_ANSWERED") {
        return !f.answer || f.answer === "" || f.answer.toLowerCase() === "<no-answer>";
      }
      if (answerMode === "ANSWERED") {
        return f.answer && f.answer !== "" && f.answer.toLowerCase() !== "<no-answer>";
      }
      if (filterAnswerText && !f.answer.toLowerCase().includes(filterAnswerText.toLowerCase())) return false;
      return true;
    });
  }

  const currentFiltered = filteredFields();
  const totalPages      = Math.max(1, Math.ceil(currentFiltered.length / FIELDS_PER_PAGE));
  const firstIdx        = (page - 1) * FIELDS_PER_PAGE;
  const pageFields      = currentFiltered.slice(firstIdx, firstIdx + FIELDS_PER_PAGE);

  /* ─────────────────────────────── render ─────────────────────── */
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10 space-y-6">
      {/* header */}
      <div className="border border-black bg-gray-100 rounded-md p-3 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          {/* db / container (readonly) */}
          <div>
            <Label className="text-sm">Database</Label>
            <Input className="h-8" value={database} readOnly />
          </div>
          <div>
            <Label className="text-sm">Container</Label>
            <Input className="h-8" value={container} readOnly />
          </div>

          {/* document picker */}
          <div>
            <Label className="text-sm">Document</Label>
            <Select value={selectedId} onValueChange={setSelectedId} disabled={isLoadingDocs}>
              <SelectTrigger className="h-8 bg-white">
                <SelectValue placeholder={isLoadingDocs ? "Loading…" : "Pick a document"} />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-64 overflow-y-auto">
                {allDocs.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>{doc.documentName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* save */}
          <div className="mt-4">
            <Button
              onClick={() => saveMutation.mutate(makeCosmosBody())}
              className="bg-green-600 hover:bg-green-700 text-white h-8 px-4"
              disabled={saveMutation.isPending || !selectedId}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* filters (dataType removed) */}
      <div className="grid md:grid-cols-5 gap-3">
        <div>
          <Label className="text-xs">Field Name</Label>
          <Input className="h-8 text-sm bg-white" placeholder="search..."
            value={filterFieldName}
            onChange={e => setFilterFieldName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Prompt</Label>
          <Input className="h-8 text-sm bg-white" placeholder="search..."
            value={filterPrompt}
            onChange={e => setFilterPrompt(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Answer</Label>
          <Input className="h-8 text-sm bg-white" placeholder="search..."
            value={filterAnswerText}
            onChange={e => { setFilterAnswerText(e.target.value); setAnswerMode("ALL"); }} />
        </div>
        <div>
          <Label className="text-xs">Answer Date</Label>
          <Input className="h-8 text-sm bg-white" placeholder="search..."
            value={filterTime}
            onChange={e => setFilterTime(e.target.value)} />
        </div>
        <div className="flex flex-col space-y-2 pt-2 md:pt-0">
          <Button size="sm" className="h-5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  onClick={() => { setAnswerMode("NOT_ANSWERED"); setFilterAnswerText(""); }}>
            Not Answered
          </Button>
          <Button size="sm" className="h-5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  onClick={() => { setAnswerMode("ANSWERED"); setFilterAnswerText(""); }}>
            Answered
          </Button>
          <Button size="sm" className="h-5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  onClick={() => {
                    setFilterFieldName(""); setFilterPrompt(""); setFilterAnswerText("");
                    setFilterTime(""); setAnswerMode("ALL");
                  }}>
            Clear
          </Button>
        </div>
      </div>

      <h1 className="text-2xl font-semibold">Query Responses</h1>
        {pageFields.map((f, idxOnPage) => {
          const idx = fields.indexOf(f);
          return (
            <div                         // tighter margin + padding
              key={idx}
              className="mb-1 rounded-md border p-1 shadow-sm"
            >
              <div className="grid grid-cols-7 gap-1 items-start">
                {/* 1) Field Name (1 col) */}
                <div className="col-span-1">
                  <Label className="text-xs">Field Name</Label>
                  <Input
                    className="h-8"
                    value={f.fieldName}
                    onChange={e => updateField(idx, "fieldName", e.target.value)}
                  />
                </div>

                {/* 2) Prompt (2 cols) */}
                <div className="col-span-2 relative">
                  <Label className="text-xs">Prompt</Label>
                  <AutoSizeTextarea
                    className="w-full p-1 border rounded text-sm"
                    value={f.prompt}
                    onChange={e => updateField(idx, "prompt", e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute top-6 right-1 text-gray-400 hover:text-gray-600"
                    onClick={() => { setModalFieldIdx(idx); setModalKey("prompt"); setModalOpen(true); }}
                  >
                    <Expand size={16}/>
                  </button>
                </div>

                {/* 3) Answer (3 cols) */}
                <div className="col-span-3 relative">
                  <Label className="text-xs">Answer</Label>
                  <AutoSizeTextarea
                    className="w-full p-1 border rounded text-sm"
                    value={f.answer}
                    onChange={e => updateField(idx, "answer", e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute top-6 right-1 text-gray-400 hover:text-gray-600"
                    onClick={() => { setModalFieldIdx(idx); setModalKey("answer"); setModalOpen(true); }}
                  >
                    <Expand size={16}/>
                  </button>
                </div>

                {/* 4) Answer Date (1 col) */}
                <div className="col-span-1">
                  <Label className="text-xs">Answer Date</Label>
                  <Input
                    type="date"
                    className="h-8"
                    value={f.timeStamp.split("T")[0] || ""}
                    onChange={e => updateField(idx, "timeStamp", e.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      {/* pagination */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" className="h-8 px-3"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}>
          Previous
        </Button>
        <span className="text-sm">Page {page} / {totalPages}</span>
        <Button variant="secondary" className="h-8 px-3"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}>
          Next
        </Button>
      </div>

      {/* download JSON */}
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="h-8"
                onClick={downloadJSON} disabled={!fields.length}>
          <Download className="mr-2 h-4 w-4"/> Download JSON
        </Button>
      </div>

      {/* modal for prompt / answer */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-white backdrop-blur-sm max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit {modalKey === "prompt" ? "Prompt" : "Answer"}
            </DialogTitle>
          </DialogHeader>

          <AutoSizeTextarea
            className="w-full p-2 border rounded"
            value={modalFieldIdx !== null ? fields[modalFieldIdx][modalKey] : ""}
            onChange={e =>
              modalFieldIdx !== null &&
              updateField(modalFieldIdx, modalKey, e.target.value)
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