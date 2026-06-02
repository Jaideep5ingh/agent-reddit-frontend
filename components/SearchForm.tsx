"use client";

import { useEffect, useState } from "react";
import { Search, Zap, FileText, ChevronDown, Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ScrapeRequest } from "@/lib/types";
import { API_BASE as API } from "@/lib/api";

const DEFAULTS: ScrapeRequest = {
  query: "",
  sort: "relevance",
  time_filter: "year",
  limit: 50,
  deep_search: true,
  report: true,
  min_score: 5,
  max_threads: 10,
  instructions: "",
  model: "gemma4:31b-cloud",
};

const SORTS = ["relevance", "hot", "top", "new", "comments"] as const;
const TIMES = ["hour", "day", "week", "month", "year", "all"] as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const MODELS = [
  { value: "gpt-oss:120b-cloud", label: "GPT-OSS 120B",  hint: "Recommended · rich detail · medium usage" },
  { value: "qwen3.5:cloud",      label: "Qwen 3.5",       hint: "Highest detail · 256K context · medium" },
  { value: "gpt-oss:20b-cloud",  label: "GPT-OSS 20B",    hint: "Lightest · best for free tier · low usage" },
  { value: "gemma4:31b-cloud",   label: "Gemma 4 31B",    hint: "Fast · low usage · less detail" },
  { value: "minimax-m3:cloud",   label: "MiniMax M3",     hint: "Frontier · heavy · high usage" },
] as const;

interface Props {
  onStart: (jobId: string, req: ScrapeRequest) => void;
  disabled: boolean;
  prefill: { q: string; n: number };
}

export default function SearchForm({ onStart, disabled, prefill }: Props) {
  const [form, setForm]        = useState<ScrapeRequest>(DEFAULTS);
  const [showAdvanced, setAdv] = useState(false);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState<string | null>(null);

  const set = <K extends keyof ScrapeRequest>(k: K, v: ScrapeRequest[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Sync example-chip clicks from the empty state into the query field.
  useEffect(() => {
    if (prefill.n > 0) setForm((f) => ({ ...f, query: prefill.q }));
  }, [prefill]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.query.trim() || loading || disabled) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "API error");
      onStart(data.job_id, form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach API");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = form.query.trim() && !loading && !disabled;

  return (
    <form onSubmit={submit} className="space-y-6">

      {/* ── Search input ─────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel>Query</SectionLabel>
        <div className="group relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-[var(--reddit-bright)]" />
          <Input
            placeholder="e.g. Best pubs in NYC"
            value={form.query}
            onChange={(e) => set("query", e.target.value)}
            className="pl-10 h-11 text-sm rounded-xl border-border bg-input/60 transition-shadow focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
          />
        </div>
      </div>

      {/* ── Mode toggles ─────────────────────────── */}
      <div className="space-y-2.5">
        <SectionLabel>Mode</SectionLabel>
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-input/40">
          <ToggleRow
            icon={<Zap className="h-4 w-4" />} accent="#facc15"
            label="Deep Search" sub="3 parallel searches via AI variants"
            checked={form.deep_search} onChange={(v) => set("deep_search", v)}
          />
          <ToggleRow
            icon={<FileText className="h-4 w-4" />} accent="#60a5fa"
            label="Generate Report" sub="AI reads top threads & writes a report"
            checked={form.report} onChange={(v) => set("report", v)}
          />
        </div>
      </div>

      {/* ── Sort + Time ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <SectionLabel>Sort</SectionLabel>
          <Select value={form.sort} onValueChange={(v) => set("sort", v as ScrapeRequest["sort"])}>
            <SelectTrigger className="h-9 text-sm rounded-lg border-border bg-input/60 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((o) => <SelectItem key={o} value={o} className="text-sm">{cap(o)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <SectionLabel>Time</SectionLabel>
          <Select value={form.time_filter} onValueChange={(v) => set("time_filter", v as ScrapeRequest["time_filter"])}>
            <SelectTrigger className="h-9 text-sm rounded-lg border-border bg-input/60 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMES.map((o) => <SelectItem key={o} value={o} className="text-sm">{cap(o)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Instructions ─────────────────────────── */}
      <div className="space-y-2">
        <SectionLabel>
          Report instructions <span className="font-normal normal-case tracking-normal opacity-60">— optional</span>
        </SectionLabel>
        <Textarea
          placeholder="e.g. Focus on budget options in Brooklyn, avoid tourist traps, under $15/drink"
          value={form.instructions}
          onChange={(e) => set("instructions", e.target.value)}
          rows={3}
          className="text-sm rounded-xl border-border bg-input/60 resize-none leading-relaxed focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
        />
      </div>

      {/* ── Advanced toggle ───────────────────────── */}
      <div>
        <button type="button" onClick={() => setAdv((s) => !s)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Advanced options
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-5 rounded-xl border border-border bg-input/40 p-4 animate-slide-up">
            <SliderRow label="Min post score" value={form.min_score} min={0} max={50}
              onChange={(v) => set("min_score", v)} />
            <SliderRow label="Max threads to analyse" value={form.max_threads} min={1} max={30}
              onChange={(v) => set("max_threads", v)} />
            <div className="space-y-2">
              <SectionLabel>Ollama model</SectionLabel>
              <Select value={form.model} onValueChange={(v) => set("model", v as string)}>
                <SelectTrigger className="h-9 text-sm rounded-lg border-border bg-input/60 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-sm">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{m.label}</span>
                        <span className="text-[10px] text-muted-foreground">{m.hint}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* ── Error ────────────────────────────────── */}
      {error && (
        <p className="text-xs text-rose-400 -mt-2 leading-relaxed">{error}</p>
      )}

      {/* ── Submit ───────────────────────────────── */}
      <Button type="submit" disabled={!canSubmit}
        className="group relative w-full h-11 text-sm font-semibold gap-2 text-white rounded-xl overflow-hidden border-0 transition-all disabled:opacity-100"
        style={{
          background: canSubmit
            ? "linear-gradient(135deg, var(--reddit-bright), var(--reddit))"
            : "rgba(255,255,255,0.06)",
          color: canSubmit ? "#fff" : "var(--muted-foreground)",
          boxShadow: canSubmit ? "0 8px 24px -8px rgba(255,69,0,0.5)" : "none",
        }}>
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting…</>
          : <><Search className="h-4 w-4" /> Research Reddit</>}
      </Button>
    </form>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </Label>
  );
}

function ToggleRow({ icon, accent, label, sub, checked, onChange }: {
  icon: React.ReactNode; accent: string; label: string;
  sub: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between px-3.5 py-3 gap-3 cursor-pointer transition-colors hover:bg-foreground/[0.02]">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: checked ? `${accent}1f` : "rgba(255,255,255,0.05)", color: checked ? accent : "var(--muted-foreground)" }}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{label}</p>
          <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange}
        className="flex-shrink-0 data-checked:bg-[var(--reddit)]" />
    </label>
  );
}

function SliderRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <SectionLabel>{label}</SectionLabel>
        <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md bg-foreground/5 font-mono">{value}</span>
      </div>
      <Slider min={min} max={max} value={[value]}
        onValueChange={(vals) => onChange(Array.isArray(vals) ? vals[0] : (vals as number))}
        className="[&_[data-slot=slider-thumb]]:border-[var(--reddit)] [&_[data-slot=slider-thumb]]:ring-[var(--ring)] [&_[data-slot=slider-range]]:bg-[var(--reddit)]" />
    </div>
  );
}
