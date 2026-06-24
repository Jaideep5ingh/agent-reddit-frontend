"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ArrowUp, MessageSquare, ChevronDown } from "lucide-react";
import type { Post } from "@/lib/types";

export default function PostsPanel({ posts, collapsed }: { posts: Post[]; collapsed?: boolean }) {
  const [open, setOpen] = useState(true);
  // Expanded through scrape + analyze (so the user can browse what was found), then
  // auto-collapses once the report starts so it takes focus. Still user-toggleable.
  useEffect(() => { if (collapsed) setOpen(false); }, [collapsed]);
  if (!posts.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/80 overflow-hidden animate-slide-up backdrop-blur-sm">
      {/* Header / toggle */}
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border bg-foreground/[0.015] transition-colors hover:bg-foreground/[0.03]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--reddit)" }} />
          <span className="text-xs font-semibold tracking-tight">Scraped Posts</span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-foreground/[0.06] text-muted-foreground tabular-nums">
            {posts.length}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>

      {/* List */}
      {open && (
        <div>
          {posts.map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
              className="group flex items-start gap-3 px-4 py-3 border-b border-border/70 last:border-0 transition-colors hover:bg-foreground/[0.025]">
              <span className="text-[10px] font-mono pt-0.5 w-5 flex-shrink-0 tabular-nums text-muted-foreground/60 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-[13px] leading-snug line-clamp-2 text-foreground/85 transition-colors group-hover:text-foreground">{p.title}</p>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium" style={{ color: "var(--reddit-bright)" }}>{p.subreddit}</span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                    <ArrowUp className="h-3 w-3" />{p.score}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                    <MessageSquare className="h-3 w-3" />{p.comments}
                  </span>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
