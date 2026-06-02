"use client";

import { Check, Loader2 } from "lucide-react";
import type { Stage } from "@/lib/types";

export default function StageBar({ stages, msg }: { stages: Stage[]; msg: string }) {
  return (
    <div className="space-y-4">
      {/* Step row */}
      <div className="flex items-start">
        {stages.map((s, i) => {
          const done = s.status === "done";
          const active = s.status === "active";
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="relative w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300"
                  style={{
                    background: done ? "linear-gradient(135deg, var(--reddit-bright), var(--reddit))"
                      : active ? "rgba(255,69,0,0.12)" : "rgba(255,255,255,0.03)",
                    borderColor: done || active ? "var(--reddit)" : "var(--border)",
                    color: done ? "#fff" : active ? "var(--reddit-bright)" : "var(--muted-foreground)",
                    boxShadow: done ? "0 4px 14px -4px rgba(255,69,0,0.5)" : "none",
                  }}>
                  {active && (
                    <span className="absolute inset-0 rounded-full animate-ping" style={{ border: "1px solid var(--reddit)", opacity: 0.4 }} />
                  )}
                  {done ? <Check className="h-4 w-4" strokeWidth={2.75} />
                    : active ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <span className="text-[11px] font-bold tabular-nums">{i + 1}</span>}
                </div>
                <span className="text-[10px] font-medium whitespace-nowrap transition-colors"
                  style={{ color: s.status === "idle" ? "var(--muted-foreground)" : active ? "var(--foreground)" : "var(--reddit-bright)" }}>
                  {s.label}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div className="h-0.5 flex-1 mx-2 mb-6 rounded-full overflow-hidden bg-border">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: stages[i + 1].status !== "idle" ? "100%" : "0%",
                      background: "linear-gradient(90deg, var(--reddit), var(--reddit-bright))",
                    }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live message */}
      {msg && (
        <div className="flex items-center gap-2.5 pt-1">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: "var(--reddit)" }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--reddit)" }} />
          </span>
          <p className="text-xs truncate text-muted-foreground">{msg}</p>
        </div>
      )}
    </div>
  );
}
