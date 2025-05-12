import { useEffect, useState } from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { ArrowUp, ArrowDown, X, Download } from "lucide-react"

/* ---------- types & constants ---------- */

type DataType =
  | "text"
  | "date"
  | "number"
  | "currency"
  | "summary50"
  | "summary100"

interface FieldBlock {
  sectionName: string
  fieldName: string
  prompt: string
  dataType: DataType
}

const DATA_TYPE_OPTIONS: { value: DataType; label: string }[] = [
  { value: "text",       label: "Text" },
  { value: "date",       label: "Date" },
  { value: "number",     label: "Number" },
  { value: "currency",   label: "Currency" },
  { value: "summary50",  label: "Summary (<50 words)" },
  { value: "summary100", label: "Summary (<100 words)" },
]

/* personas just for the dropdown demo */
const PERSONA_OPTIONS = ["Default", "Manager", "Finance", "HR", "IT"]

const EMPTY_FIELD: FieldBlock = {
  sectionName: "",
  fieldName: "",
  prompt: "",
  dataType: "text",
}

const LS_KEY = "dynamic-field-builder"

/* ---------- component ---------- */

export default function PromptsPage() {
  /* field blocks ------------------------------------------------------ */
  const [fields, setFields] = useState<FieldBlock[]>(() => {
    try {
      const persisted = localStorage.getItem(LS_KEY)
      if (persisted) return JSON.parse(persisted) as FieldBlock[]
    } catch (err) {
      console.error("Failed to parse saved JSON:", err)
    }
    return [{ ...EMPTY_FIELD }]
  })

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(fields, null, 2))
  }, [fields])

  /* persona dropdown -------------------------------------------------- */
  const [persona, setPersona] = useState<string>(PERSONA_OPTIONS[0])

  /* CRUD helpers ------------------------------------------------------ */
  const updateField =
    <K extends keyof FieldBlock>(i: number, key: K, value: FieldBlock[K]) =>
      setFields((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, [key]: value } : f)),
      )

  const addField = () => setFields((prev) => [...prev, { ...EMPTY_FIELD }])
  const deleteField = (idx: number) =>
    setFields((prev) => prev.filter((_, i) => i !== idx))

  const moveField = (from: number, to: number) =>
    setFields((prev) => {
      const arr = [...prev]
      ;[arr[from], arr[to]] = [arr[to], arr[from]]
      return arr
    })

  /* download ---------------------------------------------------------- */
  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(fields, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "field-config.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ---------------------------- render ------------------------------ */
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      {/* =======  new QUERY-ACTION bar  ======= */}
      <div className="border border-black bg-gray-100 rounded-md p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Default Persona dropdown */}
          <div className="space-y-1 min-w-[180px]">
            <Label>Default Persona</Label>
            <Select value={persona} onValueChange={setPersona}>
              <SelectTrigger>
                <SelectValue placeholder="Select persona" />
              </SelectTrigger>
              <SelectContent>
                {PERSONA_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Blue action buttons */}
          <div className="flex gap-2">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              Create&nbsp;Query
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              Edit&nbsp;Query
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              Delete&nbsp;Query
            </Button>
          </div>
        </div>
      </div>

      {/* =======  existing prompt registry  ======= */}
      <h1 className="text-3xl font-semibold">Prompt Registry</h1>

      {fields.map((f, idx) => (
        <div
          key={idx}
          className="mb-6 rounded-md border p-4 shadow-sm lg:p-6"
        >
          <div className="grid gap-4 md:grid-cols-5 items-end">
            {/* Section Name */}
            <div className="space-y-1">
              <Label>Section Name</Label>
              <Input
                value={f.sectionName}
                onChange={(e) =>
                  updateField(idx, "sectionName", e.target.value)
                }
              />
            </div>

            {/* Field Name */}
            <div className="space-y-1">
              <Label>Field Name</Label>
              <Input
                value={f.fieldName}
                onChange={(e) => updateField(idx, "fieldName", e.target.value)}
              />
            </div>

            {/* Prompt */}
            <div className="space-y-1">
              <Label>Prompt</Label>
              <Input
                value={f.prompt}
                onChange={(e) => updateField(idx, "prompt", e.target.value)}
              />
            </div>

            {/* Data Type */}
            <div className="space-y-1">
              <Label>Data Type</Label>
              <Select
                value={f.dataType}
                onValueChange={(v: DataType) => updateField(idx, "dataType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* action buttons */}
            <div className="flex gap-2 justify-end">
              {idx > 0 && (
                <Button
                  size="icon"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => moveField(idx, idx - 1)}
                >
                  <ArrowUp size={16} />
                </Button>
              )}
              {idx < fields.length - 1 && (
                <Button
                  size="icon"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => moveField(idx, idx + 1)}
                >
                  <ArrowDown size={16} />
                </Button>
              )}
              <Button
                size="icon"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => deleteField(idx)}
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* global buttons */}
      <div className="flex gap-4">
        <Button onClick={addField}>Add another field</Button>
        <Button
          variant="secondary"
          onClick={downloadJSON}
          disabled={!fields.length}
        >
          <Download className="mr-2 h-4 w-4" /> Download JSON
        </Button>
      </div>
    </div>
  )
}