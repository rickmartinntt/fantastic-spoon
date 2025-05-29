"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";                                     
import { CircularProgress } from "./progress-10"; 
import { Label } from "./label";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Separator } from "./separator"

interface Props {
  open: boolean;
  uploading: boolean;
  totalFiles: number;
  uploadedFiles: number;
  totalMB: number;
  uploadedMB: number;
  onClose: () => void;
}

export default function UploadProgressModal({
  open,
  uploading,
  totalFiles,
  uploadedFiles,
  totalMB,
  uploadedMB,
  onClose,
}: Props) {
  /* percentages for the gauges */
  const percentFiles = totalFiles ? (uploadedFiles / totalFiles) * 100 : 0;
  const percentMB    = totalMB    ? (uploadedMB   / totalMB)   * 100 : 0;
  const finished     = !uploading && uploadedFiles === totalFiles;

  /* placeholder extraction metrics — wire these up to Azure later */
  const [extract1] = React.useState(42);
  const [extract2] = React.useState(73);

  return (
    <Dialog open={open} onOpenChange={(o) => (o || finished) ? onClose() : null}>
      <DialogContent
        className="
          fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[90vw] max-w-4xl max-h-[90vh]
          rounded-lg shadow-2xl
          bg-white dark:bg-white
          p-8
          overflow-y-auto
        "
      >
        {/* --------------------------------------------------- header ------- */}
        <DialogHeader>
          <DialogTitle>Process Progress</DialogTitle>
        </DialogHeader>

        {/* --------------------------------------------------- summary card - */}
        {/* ─── Overall Summary / 5-step timeline ─── */}
        <div className="mb-8 rounded-lg border bg-muted/40 p-6">
          <h4 className="mb-6 text-sm font-semibold">Overall Summary</h4>

          {/* horizontal timeline ------------------------------------------------ */}
          <div className="flex items-center">
            {['Label 1', 'Label 2', 'Label 3', 'Label 4', 'Label 5'].map(
              (text, idx, arr) => (
                <React.Fragment key={text}>
                  {/* circle + label */}
                  <div className="flex flex-col items-center shrink-0">
                    <Avatar className="h-12 w-12">
                      {/* empty circle – customise colours here */}
                      <AvatarFallback className="w-full h-full rounded-full border border-blue-600 bg-blue-800 text-white-200" />
                    </Avatar>
                    <Label className="mt-2 text-xs">{text}</Label>
                  </div>

                  {/* connecting line (omit after the last circle) */}
                  {idx < arr.length - 1 && (
                    <Separator
                      orientation="horizontal"
                      decorative
                      className="mx-2 flex-1 h-px bg-muted-foreground/50"
                    />
                  )}
                </React.Fragment>
              )
            )}
          </div>

          {/* optional plain-text summary under the timeline -------------------- */}
          <p className="mt-6 text-sm text-center">
            {uploadedFiles}/{totalFiles} files uploaded,&nbsp;
            {uploadedMB.toFixed(2)}/{totalMB.toFixed(2)}&nbsp;MB
          </p>
        </div>

        {/* --------------------------------------------- 2-column section --- */}
        <div className="grid gap-6 sm:grid-cols-2">
         {/* ------------ Import card (left column) -------- */}
          <div className="rounded-lg border bg-muted/40 p-6">
            <h4 className="mb-6 text-sm font-semibold text-center">
              Import Progress
            </h4>

            {/* two-column layout for the gauges */}
            <div className="grid grid-cols-2 gap-6">
              {/* % files */}
              <div className="flex flex-col items-center">
                <CircularProgress
                  value={extract1}
                  size={120}
                  className="stroke-emerald-500/25"
                  progressClassName="stroke-emerald-600"
                />
                <Label className="mt-3 text-center">% Files Uploaded</Label>
              </div>

              {/* % MB */}
              <div className="flex flex-col items-center">
                <CircularProgress
                  value={extract2}
                  size={120}
                  className="stroke-amber-500/25"
                  progressClassName="stroke-amber-600"
                />
                <Label className="mt-3 text-center">% MB Uploaded</Label>
              </div>
            </div>
          </div>

          {/* ----------- Extraction card (right column) ---- */}
          <div className="rounded-lg border bg-muted/40 p-6">
            <h4 className="mb-6 text-sm font-semibold text-center">
              Extraction Progress
            </h4>

            <div className="grid grid-cols-2 gap-6">
              {/* % files extracted */}
              <div className="flex flex-col items-center">
                <CircularProgress
                  value={extract1}
                  size={120}
                  className="stroke-emerald-500/25"
                  progressClassName="stroke-emerald-600"
                />
                <Label className="mt-3 text-center">% Files Extracted</Label>
              </div>

              {/* % prompts processed */}
              <div className="flex flex-col items-center">
                <CircularProgress
                  value={extract2}
                  size={120}
                  className="stroke-amber-500/25"
                  progressClassName="stroke-amber-600"
                />
                <Label className="mt-3 text-center">% Prompts Processed</Label>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------- close button ------ */}
        {finished && (
          <DialogFooter className="pt-8">
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}