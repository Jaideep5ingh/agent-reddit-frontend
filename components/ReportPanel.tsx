"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, FileText, ChevronDown } from "lucide-react";

interface Props {
  report: string;
  streaming: boolean;
}

export default function ReportPanel({ report, streaming }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streaming && open) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [report, streaming, open]);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!report) return null;

  return (
    <div className="space-y-3 animate-slide-up">
      {/* Report card */}
      {report && (
        <div className="rounded-2xl border border-border bg-card/80 overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-foreground/[0.015]">
            <button type="button" onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-3 flex-1 min-w-0 transition-colors hover:bg-foreground/[0.03]">
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
              <FileText className="h-4 w-4" style={{ color: "var(--reddit-bright)" }} />
              <span className="text-xs font-semibold tracking-tight">Intelligence Report</span>
              {streaming && (
                <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border ml-1"
                  style={{ background: "rgba(255,69,0,0.1)", color: "var(--reddit-bright)", borderColor: "rgba(255,69,0,0.22)" }}>
                  <span className="h-1.5 w-1.5 rounded-full inline-block animate-pulse" style={{ background: "var(--reddit)" }} />
                  Generating
                </span>
              )}
            </button>
            {!streaming && (
              <button onClick={copy}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 mr-3 rounded-lg transition-colors hover:bg-foreground/[0.06]"
                style={{ color: copied ? "var(--success)" : "var(--muted-foreground)", background: "rgba(255,255,255,0.04)" }}>
                {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
              </button>
            )}
          </div>

          {/* Body — flows in the page scroll, no inner scroll trap */}
          {open && (
            <div className="px-6 py-5">
              <div className={`report-md ${streaming ? "typing-cursor" : ""}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
              </div>
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
