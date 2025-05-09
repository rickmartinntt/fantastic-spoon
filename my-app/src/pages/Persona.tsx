import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// Helpers ────────────────────────────────────────────────
const PERSONA_KEY = "personas";

const loadPersonas = (): string[] => {
  const raw = localStorage.getItem(PERSONA_KEY);
  return raw ? (JSON.parse(raw) as string[]) : ["Default"];
};

const savePersonas = (list: string[]) =>
  localStorage.setItem(PERSONA_KEY, JSON.stringify(list));

const PersonaPage = () => {
   /* PERSONAS ---------------------------------------------------------- */
  const [personas, setPersonas] = useState<string[]>(() => loadPersonas());
  const [currentPersona, setCurrentPersona] = useState<string>(personas[0]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPersona, setNewPersona] = useState("");
  
  const [textareaContent, setTextareaContent] = useState(
    'I am a home loan specialist with a large national bank and my job is to process loan documents, extract data from loan documents, and identify issues with loan documents.'
  );
  /* files ---------------------------------------------------------------- */
  const [files, setFiles] = useState<File[]>([]);
  /* handlers ------------------------------------------------------------- */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  };
  useEffect(() => {
    savePersonas(personas);
    }, [personas]);
  
  const addPersona = () => {
    if (!newPersona.trim()) return;
    const updated = Array.from(new Set([...personas, newPersona.trim()]));
    setPersonas(updated);
    setCurrentPersona(newPersona.trim());
    setNewPersona("");
    setShowAddDialog(false);
  };

  const handleCancel = () => {
    setTextareaContent(''); // Clear the content
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel */}
      <div className="w-1/3 bg-gray-100 p-4">
        <div className="space-y-4">
          {/* Button Group */}
          <div className="space-x-2">
            <Button className="bg-blue-500 text-white px-4 py-2 rounded">Create</Button>
            <Button className="bg-blue-500 text-white px-4 py-2 rounded">Edit</Button>
            <Button className="bg-red-500 text-white px-4 py-2 rounded">Delete</Button>
          </div>

          {/* Select Boxes */}
           <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Persona Name</Label>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Select
                value={currentPersona}
                onValueChange={(v) => setCurrentPersona(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select persona" />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((col) => (
                    <SelectItem value={col} key={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          {/* File Browser */} <Label htmlFor="fileInput">Choose files</Label>
            <Input
              id="fileInput"
              type="file"
              multiple
              onChange={handleFileChange}
            />
        </div>
        {/* Button Group */}
          <div className="flex space-x-2 mt-4">
            <Button className="bg-blue-500 text-white px-4 py-2 rounded">Save</Button>
            <Button
              className="bg-gray-500 text-white px-4 py-2 rounded"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
      </div>

      {/* Right Panel */}
      <div className="w-2/3 bg-white p-4">
        <div className="flex flex-col h-full">
          {/* Multiline Text Box */}
          <textarea
            className="w-full p-3 border rounded shadow-md"
            style={{ resize: 'vertical' }} // Inline style for debugging
            value={textareaContent}
            onChange={(e) => setTextareaContent(e.target.value)}
            rows={10} // Start with 10 lines
          />
        </div>
      </div>
      {/* “Add collection” dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Persona</DialogTitle>
            <DialogDescription>
              Enter a name for the new collection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="newPersona">Name</Label>
            <Input
              id="newPersona"
              placeholder="e.g. Invoices"
              value={newPersona}
              onChange={(e) => setNewPersona(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPersona()}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewPersona("");
                setShowAddDialog(false);
              }}
            >
                Cancel
              </Button>
              <Button onClick={addPersona}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default PersonaPage;
