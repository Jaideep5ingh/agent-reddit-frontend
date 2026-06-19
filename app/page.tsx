"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Sparkles, TrendingUp, UtensilsCrossed, Plane, ArrowRight, Clock, Loader2, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import SearchForm from "@/components/SearchForm";
import ThemeToggle from "@/components/ThemeToggle";
import StageBar from "@/components/StageBar";
import PostsPanel from "@/components/PostsPanel";
import ReportPanel from "@/components/ReportPanel";
import type { ScrapeRequest, Stage, StreamState } from "@/lib/types";
import { API_BASE as API } from "@/lib/api";

const INITIAL_STAGES: Stage[] = [
  { id: "scraping", label: "Scraping", status: "idle" },
  { id: "agent",    label: "Analyze",  status: "idle" },
  { id: "report",   label: "Report",   status: "idle" },
  { id: "done",     label: "Done",     status: "idle" },
];

const INITIAL: StreamState = {
  jobId: null, status: "idle", stages: INITIAL_STAGES,
  variants: [], posts: [], report: "",
  threadsTotal: 10, threadsFetched: 0,
  error: null, progressMsg: "", queued: false,
};

function patchStage(stages: Stage[], id: string, s: Stage["status"]): Stage[] {
  return stages.map((x) => (x.id === id ? { ...x, status: s } : x));
}

const EXAMPLES = [
  { icon: TrendingUp,        q: "Best rooftop bars in NYC" },
  { icon: UtensilsCrossed,   q: "Hidden gem restaurants in London" },
  { icon: Plane,             q: "Budget travel tips for Southeast Asia" },
];

// Playful, indeterminate status words shown while the agent reads threads —
// the agent picks however many threads it deems relevant, so a numeric bar is
// misleading. These rotate to signal "working" with a bit of personality.
const WHIMSY = [
  "Recombobulating",
  "Reticulating threads",
  "Consulting the hivemind",
  "Skimming the hot takes",
  "Untangling opinions",
  "Mining the comments",
  "Reading between the lines",
  "Cross-referencing subreddits",
  "Distilling signal from noise",
  "Eavesdropping on threads",
  "Weighing the upvotes",
  "Sifting karma from gold",
];
const randomWhimsy = () => WHIMSY[Math.floor(Math.random() * WHIMSY.length)];

// Client-side safety net: if a job neither finishes nor errors within this window,
// stop waiting and show the user a timeout message (the SSE/worker could be stuck).
const JOB_TIMEOUT_MS = 5 * 60 * 1000;

export default function Home() {
  const [state, setState] = useState<StreamState>(INITIAL);
  const [prefill, setPrefill] = useState({ q: "", n: 0 });
  const [whimsy, setWhimsy] = useState(randomWhimsy);
  // Mobile: the sidebar (search form) is an off-canvas drawer toggled by a header
  // button. On desktop (md+) it's always-visible and this flag is ignored.
  const [navOpen, setNavOpen] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearJobTimeout = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  const patch = (p: Partial<StreamState>) => setState((s) => ({ ...s, ...p }));

  const reset = () => { esRef.current?.close(); clearJobTimeout(); setState(INITIAL); };

  const useExample = (q: string) => {
    setPrefill((p) => ({ q, n: p.n + 1 }));
    setNavOpen(true);  // mobile: reveal the form (with the query pre-filled) so it can be run
  };

  const handleStart = useCallback((jobId: string, req: ScrapeRequest) => {
    setNavOpen(false);  // close the mobile drawer so the report is visible
    esRef.current?.close();
    const stages = req.report ? INITIAL_STAGES
      : INITIAL_STAGES.filter((s) => s.id !== "agent" && s.id !== "report");
    setState({ ...INITIAL, jobId, status: "running", stages, threadsTotal: req.max_threads, progressMsg: "Starting…" });

    const es = new EventSource(`${API}/jobs/${jobId}/stream`);
    esRef.current = es;

    // 5-minute client-side timeout: if nothing resolves the job by then, give up and
    // tell the user (rather than spinning forever). Cleared on done/error/reset.
    clearJobTimeout();
    timeoutRef.current = setTimeout(() => {
      es.close();
      setState((s) => s.status === "running"
        ? { ...s, status: "error", queued: false,
            error: "Timed out after 5 minutes. The server may still be working — please try again." }
        : s);
    }, JOB_TIMEOUT_MS);

    es.addEventListener("progress", (e) => {
      const d = JSON.parse(e.data); const step: string = d.step ?? "";
      // "queued" = waiting for a free server slot (concurrency cap). Any other step means
      // the job has started, so clear the queued flag.
      patch({ progressMsg: d.message ?? "", queued: step === "queued" });
      setState((s) => ({
        ...s,
        stages:
          step === "scraping" || step === "variants" ? patchStage(s.stages, "scraping", "active")
          : step === "scraped"  ? patchStage(s.stages, "scraping", "done")
          // Analyze phase = fetch all content → AI-score → select top-N
          : step === "fetching" || step === "scoring" || step === "agent"
              ? patchStage(patchStage(s.stages, "scraping", "done"), "agent", "active")
          : step === "selected" || step === "agent_done" ? patchStage(s.stages, "agent", "done")
          : step === "report_map" || step === "report_reduce" || step === "report"
              ? patchStage(patchStage(s.stages, "agent", "done"), "report", "active")
          : s.stages,
      }));
    });
    es.addEventListener("variants", (e) => patch({ variants: JSON.parse(e.data).queries ?? [] }));
    es.addEventListener("posts",    (e) => patch({ posts: JSON.parse(e.data).posts ?? [] }));
    es.addEventListener("agent_thinking", (e) => patch({ progressMsg: JSON.parse(e.data).message ?? "" }));
    es.addEventListener("thread_fetched", (e) => {
      const d = JSON.parse(e.data);
      setState((s) => ({ ...s, threadsFetched: d.index ?? s.threadsFetched + 1, progressMsg: `Fetching thread ${d.index}…` }));
    });
    es.addEventListener("report_token", (e) => {
      const d = JSON.parse(e.data);
      setState((s) => ({ ...s, report: s.report + (d.token ?? "") }));
    });
    es.addEventListener("done", (e) => {
      // The backend also sends the full report on `done`. If any report_token was missed
      // live (slow network, trimmed stream), overwrite with this complete copy so the
      // report never renders gappy. Falls back to the streamed text if absent.
      clearJobTimeout();
      const d = "data" in e ? JSON.parse((e as MessageEvent).data || "{}") : {};
      setState((s) => ({ ...s, status: "done", progressMsg: "", report: d.report ?? s.report, stages: s.stages.map((x) => ({ ...x, status: "done" })) }));
      es.close();
    });
    es.addEventListener("error", (e) => {
      clearJobTimeout();
      const d = "data" in e ? JSON.parse((e as MessageEvent).data) : {};
      patch({ status: "error", error: d.message ?? "Something went wrong" }); es.close();
    });
    es.onerror = () => { clearJobTimeout(); setState((s) => s.status === "running" ? { ...s, status: "error", error: "Connection lost" } : s); es.close(); };
  }, []);

  const isRunning = state.status === "running";
  const isDone    = state.status === "done";
  const hasData   = state.posts.length > 0 || !!state.report || isRunning;
  // While the agent reads threads we show rotating whimsical words instead of a
  // misleading numeric bar (the agent picks however many threads it judges useful).
  const isFetching = isRunning && state.stages.some((s) => s.id === "agent" && s.status === "active");

  useEffect(() => {
    if (!isFetching) return;
    setWhimsy(randomWhimsy());
    const id = setInterval(() => {
      setWhimsy((w) => {
        let next = randomWhimsy();
        while (next === w && WHIMSY.length > 1) next = randomWhimsy();
        return next;
      });
    }, 2400);
    return () => clearInterval(id);
  }, [isFetching]);

  // Clean up the SSE connection + pending timeout if the component unmounts mid-job.
  useEffect(() => () => { esRef.current?.close(); clearJobTimeout(); }, []);

  return (
    <div className="app-bg h-screen flex flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="relative z-20 flex-shrink-0 flex items-center justify-between px-5 h-14 border-b border-border/80 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {/* Mobile-only: open the search/filters drawer */}
          <button onClick={() => setNavOpen(true)} aria-label="Open search"
            className="md:hidden flex items-center justify-center w-8 h-8 -ml-1 rounded-lg border border-border bg-card/60 text-foreground/80 hover:text-foreground transition-colors">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <div className="relative w-7 h-7 rounded-lg flex items-center justify-center text-white text-[13px] font-black shadow-lg shadow-[var(--reddit-glow)]"
            style={{ background: "linear-gradient(135deg, var(--reddit-bright), var(--reddit))" }}>
            R
          </div>
          <div className="flex flex-col leading-none gap-0.5">
            <span className="font-semibold text-[13px] tracking-tight">Reddit Research</span>
            <span className="text-[10px] text-muted-foreground tracking-wide">AI intelligence engine</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 ml-1 text-[10px] px-2 py-0.5 rounded-full font-medium border"
            style={{ background: "rgba(255,69,0,0.1)", color: "var(--reddit-bright)", borderColor: "rgba(255,69,0,0.22)" }}>
            <Sparkles className="h-2.5 w-2.5" /> AI-powered
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-500/60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            Live
          </div>
          <ThemeToggle />
          {hasData && (
            <Button variant="outline" size="sm" onClick={reset}
              className="h-7 gap-1.5 text-xs">
              <RotateCcw className="h-3 w-3" /> New search
            </Button>
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Mobile drawer backdrop */}
        {navOpen && (
          <div onClick={() => setNavOpen(false)}
            className="md:hidden fixed inset-0 top-14 z-30 bg-black/50 backdrop-blur-sm animate-fade-in" />
        )}

        {/* Sidebar — fixed off-canvas drawer on mobile, static panel on md+ */}
        <aside
          className={`flex flex-col border-r border-border/80 backdrop-blur-sm
            fixed top-14 bottom-0 left-0 z-40 w-[85%] max-w-[340px] transition-transform duration-300
            md:static md:top-0 md:z-auto md:w-[360px] md:max-w-none md:flex-shrink-0 md:translate-x-0
            ${navOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
          style={{ background: "var(--sidebar-gradient)" }}>
          {/* Mobile-only close button */}
          <button onClick={() => setNavOpen(false)} aria-label="Close"
            className="md:hidden absolute top-3 right-3 z-10 flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-5 space-y-6">
              <SearchForm onStart={handleStart} disabled={isRunning} prefill={prefill} />
            </div>
          </ScrollArea>
          <div className="flex-shrink-0 px-5 py-3 border-t border-border/60 text-[10px] text-muted-foreground/70 flex items-center justify-between">
            <span>Powered by Ollama + Reddit API</span>
            <span className="font-mono">v0.1</span>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 sm:px-6 py-5 sm:py-7 max-w-3xl mx-auto space-y-4">

              {/* Empty state */}
              {!hasData && (
                <div className="flex flex-col items-center justify-center min-h-[72vh] gap-9 animate-fade-in">
                  <div className="relative animate-float">
                    <div className="absolute inset-0 rounded-full blur-3xl animate-orb"
                      style={{ background: "radial-gradient(circle, var(--reddit) 0%, transparent 70%)" }} />
                    <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center border shadow-2xl"
                      style={{ background: "var(--orb-surface)", borderColor: "rgba(255,69,0,0.25)" }}>
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--reddit-bright)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
                      </svg>
                    </div>
                  </div>

                  <div className="text-center space-y-3 max-w-md">
                    <h2 className="text-2xl font-semibold tracking-tight text-gradient">What do you want to research?</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Enter a query and our AI will search Reddit, hand-pick the most relevant threads,
                      and synthesize them into a clean intelligence report.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5 w-full max-w-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 text-center mb-0.5">
                      Try an example
                    </p>
                    {EXAMPLES.map(({ icon: Icon, q }) => (
                      <button key={q} onClick={() => useExample(q)}
                        className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card/60 text-left transition-all hover:border-[rgba(255,69,0,0.35)] hover:bg-card hover:-translate-y-px">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-colors"
                          style={{ background: "rgba(255,69,0,0.1)" }}>
                          <Icon className="h-3.5 w-3.5" style={{ color: "var(--reddit-bright)" }} />
                        </span>
                        <span className="text-sm flex-1 text-foreground/80 group-hover:text-foreground transition-colors">{q}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 -translate-x-1 group-hover:text-muted-foreground group-hover:translate-x-0 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Queued banner — job is waiting for a free server slot (concurrency cap) */}
              {state.queued && isRunning && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 border animate-slide-up"
                  style={{ background: "rgba(250,204,21,0.06)", borderColor: "rgba(250,204,21,0.2)" }}>
                  <Clock className="h-4 w-4 flex-shrink-0" style={{ color: "#facc15" }} />
                  <span className="text-sm font-medium" style={{ color: "#facc15" }}>Queued</span>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {state.progressMsg || "Waiting for a free slot…"}
                  </span>
                </div>
              )}

              {/* Stage bar */}
              {(isRunning || isDone) && (
                <div className="rounded-2xl border border-border bg-card/80 p-5 animate-slide-up backdrop-blur-sm">
                  <StageBar stages={state.stages} msg={state.queued ? "" : (isFetching ? `${whimsy}…` : (isRunning ? state.progressMsg : ""))} />
                </div>
              )}

              {/* Done banner */}
              {isDone && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 border animate-slide-up"
                  style={{ background: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.18)" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(34,197,94,0.16)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                  <span className="text-sm text-green-400 font-medium">Research complete</span>
                  <span className="text-sm text-muted-foreground">
                    {state.posts.length} posts · {state.threadsFetched} threads analysed
                  </span>
                </div>
              )}

              {/* Error banner */}
              {state.error && (
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 border animate-slide-up"
                  style={{ background: "rgba(244,63,94,0.06)", borderColor: "rgba(244,63,94,0.2)" }}>
                  <span className="text-rose-400 text-sm font-semibold">Error</span>
                  <span className="text-sm text-rose-300/90">{state.error}</span>
                </div>
              )}

              {/* Query variants */}
              {state.variants.length > 0 && (
                <div className="space-y-2.5 animate-slide-up">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Search queries
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {state.variants.map((q, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border bg-card/70"
                        style={{ color: i === 0 ? "var(--foreground)" : "var(--muted-foreground)" }}>
                        <span style={{ color: "var(--reddit-bright)", fontSize: 8 }}>●</span>
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <PostsPanel posts={state.posts} />
              <ReportPanel report={state.report} streaming={isRunning} />
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
