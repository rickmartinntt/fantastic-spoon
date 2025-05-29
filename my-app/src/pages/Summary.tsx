import { useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { Button }   from "../components/ui/button";
import { Input }    from "../components/ui/input";
import { Label }    from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";

interface ResultField {
  fieldName:        string;
  extractionPrompt: string;
  answer:           string;
  timeStamp:        string;
  dataType?:        string;
}

interface ResultsDocument {
  id:            string;
  documentName:  string;
  documentSize:  number;
  timeImported:  string;
  fields:        ResultField[];
}

interface FieldBlock {
  fieldName: string;
  prompt:    string;
  answer:    string;
  timeStamp: string;
  dataType:  string;
}

const DB_NAME        = "Loan Participation";
const CONTAINER_NAME = "Results";
const FIELDS_PER_PAGE = 5;
const EMPTY_FIELD: FieldBlock = {
  fieldName: "",
  prompt:    "",
  answer:    "",
  timeStamp: "",
  dataType:  "",
};

async function fetchAllResults(): Promise<ResultsDocument[]> {
  const url = `/api/items/${encodeURIComponent(CONTAINER_NAME)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function upsertResultsDoc(
  body: ResultsDocument
): Promise<ResultsDocument> {
  const url = `/api/items/${encodeURIComponent(CONTAINER_NAME)}`;
  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function formatTimestamp(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SummaryPage() {
  const qc = useQueryClient();

  const [database]  = useState(DB_NAME);
  const [container] = useState(CONTAINER_NAME);

  const {
    data: allDocs,
    isFetching: isLoadingDocs,
    isError: isDocsError,
    error: docsError,
  } = useQuery<ResultsDocument[]>({
    queryKey : ["allResults"],
    queryFn  : fetchAllResults,
    staleTime: Infinity,
  });

  const [selectedId,    setSelectedId]    = useState("");
  const [documentName, setDocumentName] = useState("");
  const [fields,       setFields]        = useState<FieldBlock[]>([EMPTY_FIELD]);
  const [page,         setPage]          = useState(1);

  // -- NEW: free-text filters --
  const [filterFieldName, setFilterFieldName] = useState("");
  const [filterPrompt,    setFilterPrompt]    = useState("");
  const [filterAnswerText, setFilterAnswerText] = useState("");
  const [filterTime,      setFilterTime]      = useState("");
  const [filterType,      setFilterType]      = useState("");

  const [answerMode, setAnswerMode] = useState<"ALL"|"ANSWERED"|"NOT_ANSWERED">("ALL");

  useEffect(() => {
    if (!selectedId || !allDocs) return;
    const doc = allDocs.find((d) => d.id === selectedId);
    if (!doc) return;
    setDocumentName(doc.documentName);
    setFields(
      (doc.fields ?? []).map((f) => ({
        fieldName: f.fieldName,
        prompt:    f.extractionPrompt,
        answer:    f.answer,
        timeStamp: f.timeStamp,
        dataType:  f.dataType ?? "",
      }))
    );
    // reset everything on doc switch
    setFilterFieldName("");
    setFilterPrompt("");
    setFilterAnswerText("");
    setFilterTime("");
    setFilterType("");
    setAnswerMode("ALL");
    setPage(1);
  }, [selectedId, allDocs]);

  useEffect(() => {
    if (isDocsError && docsError instanceof Error) {
      alert(docsError.message ?? "Failed to load");
    }
  }, [isDocsError, docsError]);

  // recompute total pages if shrinking
  useEffect(() => {
    const tot = Math.max(1, Math.ceil(filteredFields().length / FIELDS_PER_PAGE));
    if (page > tot) setPage(tot);
  }, [fields, filterFieldName, filterPrompt, filterAnswerText, filterTime, filterType, answerMode]);

  // reset to page 1 on any filter change
  useEffect(() => {
    setPage(1);
  }, [filterFieldName, filterPrompt, filterAnswerText, filterTime, filterType, answerMode]);

  const saveMutation = useMutation({
    mutationFn: (body: ResultsDocument) => upsertResultsDoc(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allResults"] });
      alert("Saved!");
    },
    onError: (err: any) => alert(err.message ?? "Save failed"),
  });

  const updateField =
    <K extends keyof FieldBlock>(i: number, k: K, v: FieldBlock[K]) =>
      setFields((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, [k]: v } : f))
      );

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(fields, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "results-fields.json";
    a.click();
  };

  const makeCosmosBody = (): ResultsDocument => ({
    id: selectedId || crypto.randomUUID(),
    documentName,
    documentSize: 0,
    timeImported: new Date().toISOString(),
    fields: fields.map((f) => ({
      fieldName:        f.fieldName,
      extractionPrompt: f.prompt,
      answer:           f.answer,
      timeStamp:        f.timeStamp || new Date().toISOString(),
      dataType:         f.dataType,
    })),
  });

  function filteredFields(tmp?: FieldBlock[]) {
    const src = tmp ?? fields;
    return src.filter((f) => {
      // fieldName, prompt, time, type substring matches
      if (filterFieldName &&
          !f.fieldName.toLowerCase().includes(filterFieldName.toLowerCase())
      ) return false;
      if (filterPrompt &&
          !f.prompt.toLowerCase().includes(filterPrompt.toLowerCase())
      ) return false;
      if (filterTime &&
          !f.timeStamp.toLowerCase().includes(filterTime.toLowerCase())
      ) return false;
      if (filterType &&
          !f.dataType.toLowerCase().includes(filterType.toLowerCase())
      ) return false;

      // answer handling
      if (answerMode === "NOT_ANSWERED") {
        if (f.answer && f.answer !== "" && f.answer.toLowerCase() !== "<no-answer>") return false;
      } else if (answerMode === "ANSWERED") {
        if (!f.answer || f.answer === "" || f.answer.toLowerCase() === "<no-answer>") return false;
      } else { // ALL
        if (
          filterAnswerText &&
          !f.answer.toLowerCase().includes(filterAnswerText.toLowerCase())
        ) {
          return false;
        }
      }
      return true;
    });
  }

  const currentFiltered = filteredFields();
  const totalPages      = Math.max(1, Math.ceil(currentFiltered.length / FIELDS_PER_PAGE));
  const firstIdx        = (page - 1) * FIELDS_PER_PAGE;
  const pageFields      = currentFiltered.slice(firstIdx, firstIdx + FIELDS_PER_PAGE);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10 space-y-6">
      {/* header */}
      <div className="border border-black bg-gray-100 rounded-md p-3 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-sm">Database</Label>
            <Select value={database} disabled>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DB_NAME}>{DB_NAME}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Container</Label>
            <Select value={container} disabled>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CONTAINER_NAME}>{CONTAINER_NAME}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Document</Label>
            <Select
              value={selectedId}
              onValueChange={setSelectedId}
              disabled={isLoadingDocs}
            >
              <SelectTrigger className="h-8 bg-white">
                <SelectValue placeholder={isLoadingDocs ? "Loading…" : "Pick a document"} />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-64 overflow-y-auto">
                {allDocs?.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.documentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
        {isLoadingDocs && <p className="text-xs text-gray-600 pt-1">Loading…</p>}
      </div>

    {/* filters */}
      <div className="grid md:grid-cols-6 gap-3">
        {/* 1: Field Name */}
        <div>
          <Label className="text-xs">Field Name</Label>
          <Input
            className="h-8 text-sm bg-white"
            placeholder="search..."
            value={filterFieldName}
            onChange={(e) => setFilterFieldName(e.target.value)}
          />
        </div>

        {/* 2: Prompt */}
        <div>
          <Label className="text-xs">Prompt</Label>
          <Input
            className="h-8 text-sm bg-white"
            placeholder="search..."
            value={filterPrompt}
            onChange={(e) => setFilterPrompt(e.target.value)}
          />
        </div>

        {/* 3: Answer */}
        <div>
          <Label className="text-xs">Answer</Label>
          <Input
            className="h-8 text-sm bg-white"
            placeholder="search..."
            value={filterAnswerText}
            onChange={(e) => {
              setFilterAnswerText(e.target.value);
              setAnswerMode("ALL");
            }}
          />
        </div>

        {/* 4: Timestamp */}
        <div>
          <Label className="text-xs">Answer Date</Label>
          <Input
            className="h-8 text-sm bg-white"
            placeholder="search..."
            value={filterTime}
            onChange={(e) => setFilterTime(e.target.value)}
          />
        </div>

        {/* 5: Data Type */}
        <div>
          <Label className="text-xs">Data Type</Label>
          <Input
            className="h-8 text-sm bg-white"
            placeholder="search..."
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          />
        </div>

        {/* 6: Buttons (vertical stack) */}
        <div className="flex flex-col space-y-2 pt-2 md:pt-0">
          <Button
            size="sm"
            className="w-full h-5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
            onClick={() => {
              setAnswerMode("NOT_ANSWERED");
              setFilterAnswerText("");
            }}
          >
            Not Answered
          </Button>
          <Button
            size="sm"
            className="w-full h-5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
            onClick={() => {
              setAnswerMode("ANSWERED");
              setFilterAnswerText("");
            }}
          >
            Answered
          </Button>
          <Button
            size="sm"
            className="w-full h-5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
            onClick={() => {
              setFilterFieldName("");
              setFilterPrompt("");
              setFilterAnswerText("");
              setFilterTime("");
              setFilterType("");
              setAnswerMode("ALL");
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* field editor */}
      <h1 className="text-2xl font-semibold">Query Responses</h1>
      {pageFields.map((f, idxOnPage) => {
        const idx = fields.indexOf(f);
        return (
          <div key={idx} className="mb-3 rounded-md border p-2 shadow-sm">
            <div className="grid gap-2 md:grid-cols-5 items-start">
              <div>
                <Label className="text-xs">Field Name</Label>
                <Input
                  className="h-8"
                  value={f.fieldName}
                  onChange={(e) =>
                    updateField(idx, "fieldName", e.target.value)
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Prompt</Label>
                <Input
                  className="h-8"
                  value={f.prompt}
                  onChange={(e) => updateField(idx, "prompt", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Answer</Label>
                <Textarea
                  rows={3}
                  value={f.answer}
                  onChange={(e) => updateField(idx, "answer", e.target.value)}
                  className="resize-y min-h-[6rem]"
                />
              </div>
              <div>
                <Label className="text-xs">Answer Date</Label>
                <Input
                  className="h-8"
                  value={formatTimestamp(f.timeStamp)}
                  readOnly
                />
              </div>
              <div>
                <Label className="text-xs">Data Type</Label>
                <Input className="h-8" value={f.dataType} readOnly />
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
        <Button
          variant="secondary"
          onClick={downloadJSON}
          disabled={!fields.length}
          className="h-8"
        >
          Download JSON
        </Button>
      </div>
    </div>
  );
}