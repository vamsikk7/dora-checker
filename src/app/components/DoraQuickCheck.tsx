"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, BarChart2 } from "lucide-react";

// --- Helpers ---------------------------------------------------------------
const clampNum = (v: number, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  isFinite(v) ? Math.min(Math.max(v, min), max) : 0;

// DORA thresholds (simplified from Accelerate benchmarks)
const DORA_FREQ = {
  elite: { minPerMonth: 30, label: "Multiple/day (≥30/mo)" },
  high: { minPerMonth: 4, label: "Daily–Weekly (4–29/mo)" },
  medium: { minPerMonth: 1, label: "Weekly–Monthly (1–3/mo)" },
  low: { minPerMonth: 0, label: "< Monthly (<1/mo)" },
} as const;

type DoraTier = "elite" | "high" | "medium" | "low" | "na";

function freqTier(perMonth: number): DoraTier {
  if (perMonth >= DORA_FREQ.elite.minPerMonth) return "elite";
  if (perMonth >= DORA_FREQ.high.minPerMonth) return "high";
  if (perMonth >= DORA_FREQ.medium.minPerMonth) return "medium";
  if (perMonth > 0) return "low";
  return "na";
}

function cfrTier(cfr: number | null): DoraTier {
  if (cfr === null) return "na";
  if (cfr <= 0.15) return "elite"; // elite/high ≤15%
  if (cfr <= 0.3) return "medium";
  return "low";
}

function leadTier(days: number | null): DoraTier {
  if (days === null) return "na";
  if (days <= 1) return "elite"; // ≤1 day
  if (days <= 7) return "high";  // 1 day – 1 week
  if (days <= 30) return "medium"; // 1 week – 1 month
  return "low"; // > 1 month
}

function mttrTier(hours: number | null): DoraTier {
  if (hours === null) return "na";
  if (hours <= 1) return "elite"; // ≤1 hour
  if (hours <= 24) return "high"; // ≤1 day
  if (hours <= 24 * 7) return "medium"; // ≤1 week
  return "low"; // > 1 week
}

function tierBadge(t: DoraTier) {
  const map: Record<DoraTier, { label: string; className: string }> = {
    elite: { label: "Elite", className: "bg-emerald-600" },
    high: { label: "High", className: "bg-green-600" },
    medium: { label: "Medium", className: "bg-amber-600" },
    low: { label: "Low", className: "bg-red-600" },
    na: { label: "N/A", className: "bg-slate-500" },
  };
  return (
    <Badge className={`text-white ${map[t].className} px-2 py-1 rounded-full`}
      variant="secondary">
      {map[t].label}
    </Badge>
  );
}

function tierGapText(
  t: DoraTier,
  metric: "freq" | "cfr" | "lead" | "mttr",
  perMonth?: number,
  cfr?: number | null,
  leadDays?: number | null,
  mttrHours?: number | null
) {
  if (t === "elite") return "You’re at leader level – keep it up!";
  if (metric === "freq" && typeof perMonth === "number") {
    const needed = Math.max(0, 30 - perMonth);
    if (t === "high") return `~${needed} more deploys/mo to reach Elite (≥30/mo).`;
    if (t === "medium") return `Increase cadence by ~${Math.max(0, 4 - perMonth)}+/mo to reach High, ~${needed} to reach Elite.`;
    if (t === "low") return `Raise to ≥1/mo for Medium; aim for 30/mo to match Elite.`;
  }
  if (metric === "cfr" && typeof cfr === "number") {
    const pct = Math.round(cfr * 100);
    if (t === "medium") return `Reduce change failures to ≤15% (now ~${pct}%).`;
    if (t === "low") return `High failure rate (~${pct}%). Target ≤15% for Elite/High.`;
  }
  if (metric === "lead" && leadDays != null) {
    if (t === "high") return `Trim lead time to ≤1 day (now ~${leadDays}d) via smaller batches & faster reviews.`;
    if (t === "medium") return `Bring lead time under 1 week (now ~${leadDays}d) with CI/CD & WIP limits.`;
    if (t === "low") return `Lead time is long (~${leadDays}d). Aim ≤30d for Medium and ≤1d for Elite.`;
  }
  if (metric === "mttr" && mttrHours != null) {
    if (t === "high") return `Reduce MTTR to ≤1 hour (now ~${mttrHours}h) via fast rollback & auto-remediation.`;
    if (t === "medium") return `Bring MTTR under 24h (now ~${mttrHours}h) with better alerting & runbooks.`;
    if (t === "low") return `MTTR is high (~${mttrHours}h). Target ≤168h (1 week) then ≤1h for Elite.`;
  }
  return "";
}

// --- Component -------------------------------------------------------------
export default function DoraQuickCheck() {
  const [step, setStep] = useState(0);
  const [deploys, setDeploys] = useState<number | "">(12);
  const [team, setTeam] = useState<number | "">(20);
  const [squads, setSquads] = useState<number | "">(4);
  const [errors, setErrors] = useState<number | "">(2);
  const [leadDays, setLeadDays] = useState<number | "">(3); // new
  const [mttrHours, setMttrHours] = useState<number | "">(8); // new

  const steps = [
    {
      title: "Deployments per month",
      desc: "How many production deployments do you make in a typical month?",
      value: deploys,
      onChange: (v: string) => setDeploys(v === "" ? "" : clampNum(+v)),
      placeholder: "e.g., 25",
    },
    {
      title: "Team size",
      desc: "Roughly how many engineers are in the delivery org?",
      value: team,
      onChange: (v: string) => setTeam(v === "" ? "" : clampNum(+v)),
      placeholder: "e.g., 20",
    },
    {
      title: "Number of squads",
      desc: "How many cross‑functional squads/streams?",
      value: squads,
      onChange: (v: string) => setSquads(v === "" ? "" : clampNum(+v)),
      placeholder: "e.g., 4",
    },
    {
      title: "Production errors (per month)",
      desc: "Count of incidents attributable to recent changes (rollbacks, hotfixes, SEVs).",
      value: errors,
      onChange: (v: string) => setErrors(v === "" ? "" : clampNum(+v)),
      placeholder: "e.g., 2",
    },
    {
      title: "Lead time (days)",
      desc: "Typical time from code committed to running in production (in days).",
      value: leadDays,
      onChange: (v: string) => setLeadDays(v === "" ? "" : clampNum(+v)),
      placeholder: "e.g., 2",
    },
    {
      title: "MTTR (hours)",
      desc: "Mean time to restore service after a production incident (in hours).",
      value: mttrHours,
      onChange: (v: string) => setMttrHours(v === "" ? "" : clampNum(+v)),
      placeholder: "e.g., 6",
    },
  ];

  const validNumbers = useMemo(() => {
    const d = typeof deploys === "number" ? deploys : 0;
    const t = typeof team === "number" ? team : 0;
    const s = typeof squads === "number" ? squads : 1;
    const e = typeof errors === "number" ? errors : 0;
    const ld = typeof leadDays === "number" ? leadDays : null;
    const mh = typeof mttrHours === "number" ? mttrHours : null;
    return { d, t, s: s || 1, e, ld, mh };
  }, [deploys, team, squads, errors, leadDays, mttrHours]);

  const metrics = useMemo(() => {
    const { d, t, s, e, ld, mh } = validNumbers;
    const perSquad = d / s;
    const perEng = t ? d / t : 0;
    const cfr = d > 0 ? Math.min(1, e / d) : null; // change failure rate (approx)
    const freq = freqTier(d);
    const cfrT = cfrTier(cfr);
    const ltT = leadTier(ld);
    const mttrT = mttrTier(mh);

    // Normalized bars for visuals
    const freqPct = Math.min(100, Math.round((d / 30) * 100)); // 30/mo = 100%
    const cfrPct = cfr === null ? 0 : Math.max(0, Math.round((1 - cfr / 0.3) * 100)); // 0.3 => 0%

    // For lead time: 1 day = 100%, 30 days = 0%
    const ltPct = ld == null ? 0 : Math.max(0, Math.min(100, Math.round((1 - (ld - 1) / 29) * 100)));
    // For MTTR: 1h = 100%, 168h (1 week) = 0%
    const mttrPct = mh == null ? 0 : Math.max(0, Math.min(100, Math.round((1 - (mh - 1) / (168 - 1)) * 100)));

    return { perSquad, perEng, cfr, freq, cfrT, freqPct, cfrPct, ltT, mttrT, ltPct, mttrPct };
  }, [validNumbers]);

  const atLast = step >= steps.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      <header className="max-w-3xl w-full mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">DORA Quick Check</h1>
        <p className="text-slate-600 mt-1">Answer a few questions to see how your delivery cadence compares to DORA leaders.</p>
      </header>

      {!atLast ? (
        <Card className="w-full max-w-3xl shadow-lg rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-500">Step {step + 1} of {steps.length}</span>
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-slate-900" : "bg-slate-300"}`} />
                ))}
              </div>
            </div>

            <h2 className="text-xl font-medium mb-1">{steps[step].title}</h2>
            <p className="text-slate-600 mb-4">{steps[step].desc}</p>

            <div className="grid grid-cols-1 gap-3">
              <Input
                type="number"
                inputMode="numeric"
                placeholder={steps[step].placeholder}
                value={steps[step].value as number | ''}
                onChange={(e) => steps[step].onChange(e.target.value)}
                className="h-12 text-lg"
                min={0}
              />
            </div>

            <div className="flex items-center justify-between mt-6">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep((s) => s + 1)}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-5xl shadow-xl rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Your Results</h2>
            </div>
            <p className="text-slate-600 mb-6">Here’s how your inputs compare with DORA leader benchmarks. Adjust values using the <span className="font-medium">Edit answers</span> button to see different scenarios.</p>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Deployment Frequency */}
              <div className="p-4 rounded-2xl bg-white border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Deployment Frequency</h3>
                  {tierBadge(metrics.freq)}
                </div>
                <p className="text-sm text-slate-600 mb-3">Deployments/mo: <span className="font-medium">{validNumbers.d}</span> · Per squad/mo: <span className="font-medium">{metrics.perSquad.toFixed(1)}</span> · Per engineer/mo: <span className="font-medium">{metrics.perEng.toFixed(2)}</span></p>
                <Progress value={metrics.freqPct} className="h-2" />
                <p className="text-xs text-slate-500 mt-2">Elite: {DORA_FREQ.elite.label} · High: {DORA_FREQ.high.label}</p>
                <p className="text-sm mt-2 text-slate-700">{tierGapText(metrics.freq, "freq", validNumbers.d)}</p>
              </div>

              {/* Change Failure Rate */}
              <div className="p-4 rounded-2xl bg-white border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Change Failure Rate</h3>
                  {tierBadge(metrics.cfrT)}
                </div>
                <p className="text-sm text-slate-600 mb-3">Prod errors/mo: <span className="font-medium">{validNumbers.e}</span> {metrics.cfr !== null && (
                  <>· CFR: <span className="font-medium">{Math.round(metrics.cfr * 100)}%</span></>
                )}</p>
                <Progress value={metrics.cfrPct} className="h-2" />
                <p className="text-xs text-slate-500 mt-2">Leaders target ≤15% change failure rate.</p>
                <p className="text-sm mt-2 text-slate-700">{tierGapText(metrics.cfrT, "cfr", undefined, metrics.cfr)}</p>
              </div>

              {/* Lead Time for Changes */}
              <div className="p-4 rounded-2xl bg-white border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Lead Time for Changes</h3>
                  {tierBadge(metrics.ltT)}
                </div>
                <p className="text-sm text-slate-600 mb-3">Lead time (days): <span className="font-medium">{validNumbers.ld ?? "—"}</span></p>
                <Progress value={metrics.ltPct} className="h-2" />
                <p className="text-xs text-slate-500 mt-2">Elite ≈ ≤1 day · High ≈ ≤1 week</p>
                <p className="text-sm mt-2 text-slate-700">{tierGapText(metrics.ltT, "lead", undefined, null, validNumbers.ld)}</p>
              </div>

              {/* Mean Time to Restore (MTTR) */}
              <div className="p-4 rounded-2xl bg-white border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">MTTR</h3>
                  {tierBadge(metrics.mttrT)}
                </div>
                <p className="text-sm text-slate-600 mb-3">MTTR (hours): <span className="font-medium">{validNumbers.mh ?? "—"}</span></p>
                <Progress value={metrics.mttrPct} className="h-2" />
                <p className="text-xs text-slate-500 mt-2">Elite ≈ ≤1 hour · High ≈ ≤24 hours</p>
                <p className="text-sm mt-2 text-slate-700">{tierGapText(metrics.mttrT, "mttr", undefined, null, null, validNumbers.mh)}</p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-900 text-white">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-medium">What to try next</h3>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Adopt smaller batch sizes and trunk‑based development to safely increase deployment cadence.</li>
                <li>Automate progressive delivery (feature flags, canary, blue‑green) to reduce blast radius.</li>
                <li>Invest in test reliability (contract tests, e2e smoke) to drive CFR down toward ≤15%.</li>
                <li>Map your value stream to reduce lead time; enforce WIP limits; parallelize reviews.</li>
                <li>Lower MTTR with fast rollback, runbooks, on‑call drills, and automated health checks.</li>
              </ul>
            </div>

            <div className="flex items-center justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Edit answers
              </Button>
              <div className="text-xs text-slate-500">Benchmarks derived from public DORA/Accelerate summaries; this tool estimates CFR as errors ÷ deployments.</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating controls */}
      {!atLast && (
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={() => setStep((s) => Math.min(steps.length, s + 1))}>
            {step + 1 < steps.length ? (<>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </>) : (
              <>See results <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      )}

      {atLast && (
        <div className="mt-4">
          <p className="text-sm text-slate-500">Tip: Screenshot this card or export as PDF from your browser’s print dialog.</p>
        </div>
      )}
    </div>
  );
}