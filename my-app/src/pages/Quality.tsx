// src/pages/Quality.tsx
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listBlobs } from "../hooks/useAzureBlobUpload";
import { Button }   from "../components/ui/button";
import { Input }    from "../components/ui/input";
import { Label }    from "../components/ui/label";
//import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Expand, Download } from "lucide-react";

/* ───────── auto-sizing textarea ───────── */
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
    useEffect(() => {
        const ta = ref.current;
        if (!ta) return;
        ta.style.height = "auto";
        ta.style.height = ta.scrollHeight + "px";
    }, [value]);
    return (
    <textarea
        ref={ref}
        value={value}
        onChange={e => {
        const ta = ref.current;
        if (ta) {
            ta.style.height = "auto";
            ta.style.height = ta.scrollHeight + "px";
        }
        onChange(e);
        }}
        className={`resize-none overflow-hidden ${className}`}
    />
    );
}

/* ───────── Types ───────── */
interface ResultField {
    fieldName:        string;
    extractionPrompt: string;
    answer:           string;
    timeStamp:        string;
}

interface ResultsDocument {
    id:           string;
    documentName: string;
    docType?:     string;
    persona?:     string;
    fields:       ResultField[];
}

interface QualityField extends ResultField {
    qualityAnswer: string;
    matchPct:      string;   // keep as string for easy input (e.g. “97”)
    approved:      boolean;
}

interface QualityDocument {
    id:        string;  // QualityID
    fileName:  string;
    querySet:  string;
    persona:   string;
    createdAt: string;
    fields:    QualityField[];
}

/* ───────── constants / helpers ───────── */
const RESULTS_CONTAINER  = "Results";
const QUALITY_CONTAINER  = "Quality";
const DB_NAME            = "Loan Participation";
const FIELDS_PER_PAGE    = 5;

const EMPTY_FIELD: QualityField = {
    fieldName: "", extractionPrompt: "", answer: "", timeStamp: "",
    qualityAnswer: "", matchPct: "", approved: false,
};

async function fetchAllResults(): Promise<ResultsDocument[]> {
    const res = await fetch(`/api/items/${encodeURIComponent(RESULTS_CONTAINER)}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function upsertQualityDoc(body: QualityDocument) {
    const res = await fetch(`/api/items/${encodeURIComponent(QUALITY_CONTAINER)}`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

function isoToday() {
    return new Date().toISOString();
}

/* ───────── component ───────── */
export default function QualityPage() {
    const qc = useQueryClient();

  /* immutable db/container display */
    const [database]        = useState(DB_NAME);
    const [sourceContainer] = useState(RESULTS_CONTAINER);
    const [targetContainer] = useState(QUALITY_CONTAINER);

  /* pull every Result doc for picker */
    const { data: allDocs = [], isFetching } = useQuery({
        queryKey: ["allResults"],
        queryFn : fetchAllResults,
        staleTime: Infinity,
    });

  /* selection + meta */
    const [selectedId, setSelectedId] = useState("");
    const [fileName,   setFileName]   = useState("");
    const [querySet,   setQuerySet]   = useState("");
    const [persona,    setPersona]    = useState("");

  /* generated Quality Id */
    const [qualityId] = useState(() => crypto.randomUUID());

  /* fields (working copy) + pristine copy for reset */
    const [fields,        setFields]        = useState<QualityField[]>([EMPTY_FIELD]);
    const [initialFields, setInitialFields] = useState<QualityField[]>([EMPTY_FIELD]);

  /* pagination */
    const [page, setPage] = useState(1);

  /* modal */
    const [modalOpen,     setModalOpen]     = useState(false);
    const [modalFieldIdx, setModalFieldIdx] = useState<number | null>(null);
    const [modalKey,      setModalKey]      = useState<"extractionPrompt" | "answer" | "qualityAnswer">("qualityAnswer");

  /* load once a doc is chosen */
    useEffect(() => {
        if (!selectedId) return;
        const src = allDocs.find(d => d.id === selectedId);
        if (!src) return;

        setFileName(src.documentName);
        setQuerySet(src.docType ?? "");
        setPersona (src.persona ?? "");

    const mapped: QualityField[] =
        (src.fields ?? []).map(f => ({
            fieldName       : f.fieldName,
            extractionPrompt: f.extractionPrompt,
            answer          : f.answer,
            timeStamp       : f.timeStamp,
            qualityAnswer   : "",
            matchPct        : "",
            approved        : false,
        }));

    setFields(mapped.length ? mapped : [EMPTY_FIELD]);
    setInitialFields(mapped.length ? mapped : [EMPTY_FIELD]);
    setPage(1);

    /* supplement meta from blob if missing */
    if (!src.docType || !src.persona) {
        (async () => {
        try {
            const blobs = await listBlobs();
            const b     = blobs.find(b => b.name === src.documentName);
            if (!b) return;
            if (!src.docType ) setQuerySet (b.docType  || "");
            if (!src.persona ) setPersona  (b.persona  || "");
        } catch { /* ignore */ }
        })();
    }
    }, [selectedId, allDocs]);

  /* mutations */
    const saveMutation = useMutation({
        mutationFn: upsertQualityDoc,
        onSuccess : () => { qc.invalidateQueries({ queryKey: ["allResults"] }); alert("Saved!"); },
        onError   : (e: any) => alert(e.message ?? "Save failed"),
    });

    const buildQualityDoc = (): QualityDocument => ({
        id       : qualityId,
        fileName,
        querySet,
        persona,
        createdAt: isoToday(),
        fields   : fields,
    });

  /* helpers */
    const updateField =
        <K extends keyof QualityField>(i: number, k: K, v: QualityField[K]) =>
        setFields(p => p.map((f, idx) => idx === i ? { ...f, [k]: v } : f));

    const resetAll = () => setFields(initialFields);
    const submitAll = () => saveMutation.mutate(buildQualityDoc());

    const downloadJSON = () => {
        const blob = new Blob([JSON.stringify(fields, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href  = URL.createObjectURL(blob);
        a.download = "quality-fields.json";
        a.click();
    };

  /* pagination slice */
    const totalPages   = Math.max(1, Math.ceil(fields.length / FIELDS_PER_PAGE));
    const firstIdx     = (page - 1) * FIELDS_PER_PAGE;
    const pageFields   = fields.slice(firstIdx, firstIdx + FIELDS_PER_PAGE);

  /* ───────────────── render ───────────────── */
    return (
        <div className="mx-auto max-w-screen-xl px-4 py-8 space-y-6">
        {/* ───── Top controls: Submit / Reset / Save ───── */}
        <div className="flex gap-3">
        <Button onClick={submitAll} className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-4"
                disabled={!selectedId || saveMutation.isPending}>
            Submit
        </Button>
        <Button onClick={resetAll}  variant="secondary" className="h-8 px-4"
                disabled={!selectedId}>
            Reset
        </Button>
        <Button onClick={() => saveMutation.mutate(buildQualityDoc())}
                className="bg-green-600 hover:bg-green-700 text-white h-8 px-4"
                disabled={!selectedId || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save"}
        </Button>
        </div>

      {/* ───── Header (db / containers / doc pick) ───── */}
        <div className="border bg-gray-100 rounded-md p-3 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
            <div>
                <Label className="text-sm">Database</Label>
                <Input className="h-8" value={database} readOnly />
            </div>
            <div>
                <Label className="text-sm">Source Container</Label>
                <Input className="h-8" value={sourceContainer} readOnly />
            </div>
            <div>
                <Label className="text-sm">Target Container</Label>
                <Input className="h-8" value={targetContainer} readOnly />
            </div>
            <div>
                <Label className="text-sm">Result Document</Label>
                <Select value={selectedId} onValueChange={setSelectedId} disabled={isFetching}>
                <SelectTrigger className="h-8 bg-white">
                <SelectValue placeholder={isFetching ? "Loading…" : "Pick a document"} />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-64 overflow-y-auto">
                    {allDocs.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>{doc.documentName}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
        </div>

        {/* file meta */}
        {selectedId && (
            <div className="grid sm:grid-cols-3 gap-2 pt-3">
            <div>
                <Label className="text-xs">File Name</Label>
                <Input className="h-8 text-xs" value={fileName} readOnly />
            </div>
            <div>
                <Label className="text-xs">Query Set</Label>
                <Input className="h-8 text-xs" value={querySet} readOnly />
            </div>
            <div>
                <Label className="text-xs">Persona</Label>
                <Input className="h-8 text-xs" value={persona} readOnly />
            </div>
            </div>
        )}
      </div>

      {/* ───── Field editor ───── */}
      <h1 className="text-xl font-semibold">Quality Review</h1>

      {pageFields.map((f, idxOnPage) => {
        const idx = firstIdx + idxOnPage;
        return (
          <div key={idx} className="mb-1 rounded-md border p-1 shadow-sm">
            {/* 10-column grid */}
            <div className="grid grid-cols-10 gap-1 items-start">
              {/* Field Name (1) */}
              <div className="col-span-1">
                <Label className="text-[10px]">Field</Label>
                <Input className="h-8" value={f.fieldName}
                       onChange={e => updateField(idx,"fieldName",e.target.value)}/>
              </div>

              {/* Prompt (2) */}
              <div className="col-span-2 relative">
                <Label className="text-[10px]">Prompt</Label>
                <AutoSizeTextarea className="w-full p-1 border rounded text-xs"
                                  value={f.extractionPrompt}
                                  onChange={e => updateField(idx,"extractionPrompt",e.target.value)}/>
                <button type="button"
                        className="absolute top-6 right-1 text-gray-400 hover:text-gray-600"
                        onClick={() => { setModalFieldIdx(idx); setModalKey("extractionPrompt"); setModalOpen(true); }}>
                  <Expand size={14}/>
                </button>
              </div>

              {/* Answer (2) */}
              <div className="col-span-2 relative">
                <Label className="text-[10px]">Answer</Label>
                <AutoSizeTextarea className="w-full p-1 border rounded text-xs"
                                  value={f.answer}
                                  onChange={e => updateField(idx,"answer",e.target.value)}/>
                <button type="button"
                        className="absolute top-6 right-1 text-gray-400 hover:text-gray-600"
                        onClick={() => { setModalFieldIdx(idx); setModalKey("answer"); setModalOpen(true); }}>
                  <Expand size={14}/>
                </button>
              </div>

              {/* Quality Answer (2) */}
              <div className="col-span-2 relative">
                <Label className="text-[10px]">Quality Answer</Label>
                <AutoSizeTextarea className="w-full p-1 border rounded text-xs"
                                  value={f.qualityAnswer}
                                  onChange={e => updateField(idx,"qualityAnswer",e.target.value)}/>
                <button type="button"
                        className="absolute top-6 right-1 text-gray-400 hover:text-gray-600"
                        onClick={() => { setModalFieldIdx(idx); setModalKey("qualityAnswer"); setModalOpen(true); }}>
                  <Expand size={14}/>
                </button>
              </div>

              {/* Match % (1) */}
              <div className="col-span-1">
                <Label className="text-[10px]">Match&nbsp;%</Label>
                <Input className="h-8" type="number" min="0" max="100" step="0.1"
                       value={f.matchPct}
                       onChange={e => updateField(idx,"matchPct",e.target.value)}/>
              </div>

              {/* Approved (1) */}
              <div className="col-span-1 flex flex-col items-center">
                <Label className="text-[10px]">Approved</Label>
               {/* <Checkbox
                  checked={f.approved}
                  onCheckedChange={val => updateField(idx,"approved",Boolean(val))}
                /> */}
              </div>

              {/* Answer Date (1) */}
              <div className="col-span-1">
                <Label className="text-[10px]">Date</Label>
                <Input type="date" className="h-8"
                       value={f.timeStamp.split("T")[0] || ""}
                       onChange={e => updateField(idx,"timeStamp",e.target.value)}/>
              </div>
            </div>
          </div>
        );
      })}

      {/* pagination */}
      <div className="flex items-center justify-between pt-1">
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
          <Download className="mr-2 h-4 w-4" /> Download JSON
        </Button>
      </div>

      {/* modal for text expansion */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-white backdrop-blur-sm max-w-lg">
          <DialogHeader><DialogTitle>Edit</DialogTitle></DialogHeader>
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