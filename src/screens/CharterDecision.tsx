import { motion } from "framer-motion";
import { useForecast, useOptimize } from "@/lib/hooks";
import { RouteSelector } from "@/components/RouteSelector";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { DemoBadge, LiveBadge, SkeletonBlock, InlineError } from "@/components/states";
import { fmtInr, fmtPct, riskTone, changeTone } from "@/lib/format";
import { Check, Clock, Eye, ArrowRight, ListChecks } from "lucide-react";
import { useSelection } from "@/app/AppShell";

type DecisionState = "CHARTER NOW" | "WAIT 7 DAYS" | "WAIT 30 DAYS" | "WAIT 90 DAYS";

export function CharterDecision() {
  const { sel, setSel, goto: onNavigate } = useSelection();
  const forecastQ = useForecast(sel);
  const optimizeQ = useOptimize(sel);
  const f = forecastQ.data;
  const o = optimizeQ.data;
  const isDemo = !!f?._demo || !!o?._demo;
  const active = (o?.recommended ?? "") as DecisionState;
  const recommendedOption = o?.options.find((opt) => opt.label === o.recommended);
  const activeRisk = recommendedOption?.risk ?? "MEDIUM";

  const states: { id: DecisionState; icon: typeof Check; desc: string }[] = [
    { id: "CHARTER NOW", icon: Check, desc: "Lock the current rate. Zero exposure." },
    { id: "WAIT 7 DAYS", icon: Clock, desc: "Delay 7 days for the modeled entry." },
    { id: "WAIT 30 DAYS", icon: Eye, desc: "Delay 30 days for the modeled entry." },
    { id: "WAIT 90 DAYS", icon: Eye, desc: "Delay 90 days for the modeled entry." },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Charter Decision</h1>
          {isDemo ? <DemoBadge /> : f ? <LiveBadge /> : null}
        </div>
        <p className="text-sm text-slate-400">Risk-adjusted chartering recommendation.</p>
      </div>

      <div className="panel p-5">
        <RouteSelector value={sel} onChange={setSel} />
      </div>

      {/* Live decision states */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {states.map((s, i) => {
          const isActive = s.id === active;
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className={isActive ? "panel-hero p-5" : "panel p-5"}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <s.icon
                    className={`h-4 w-4 ${isActive ? "text-accent-400" : "text-slate-500"}`}
                    strokeWidth={1.75}
                  />
                  <div className="text-base font-semibold text-white">{s.id}</div>
                </div>
                {isActive && (
                  <span className="flex items-center gap-1.5 text-2xs font-medium text-accent-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-400" /> Active
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-400">{s.desc}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Decision detail */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="panel p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">Decision summary</h2>
          <p className="mt-1 text-xs text-slate-500">
            {sel.origin} → {sel.destination} · {sel.vessel}
          </p>

          {forecastQ.isLoading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-10" />
              ))}
            </div>
          ) : forecastQ.isError ? (
            <div className="mt-4">
              <InlineError error={forecastQ.error} onRetry={() => forecastQ.refetch()} />
            </div>
          ) : f ? (
            <div className="mt-5 space-y-3">
              <DetailRow label="Decision" value={o?.recommended ?? "—"} tone="text-accent-300" />
              <DetailRow
                label="Confidence"
                value={`${f.confidence.toFixed(1)}%`}
                tone="text-success-400"
              />
              <DetailRow label="Risk" value={activeRisk} tone={riskTone(activeRisk).text} />
              <DetailRow
                label="Expected savings"
                value={recommendedOption ? fmtInr(recommendedOption.savings) : "—"}
                tone="text-success-400"
              />
              <DetailRow
                label="Expected movement"
                value={fmtPct(f.expected_change_pct)}
                tone={changeTone(f.expected_change_pct)}
              />
              <div className="my-2 divider" />
              <div>
                <div className="label-mono mb-2">Reason</div>
                <p className="text-sm leading-relaxed text-slate-400">
                  {f.reason ??
                    "Recommendation is based on the live forecast and risk-adjusted procurement optimizer."}
                </p>
              </div>
            </div>
          ) : null}

          <button
            onClick={() => onNavigate("whatif")}
            className="btn-primary mt-6 w-full sm:w-auto"
          >
            Run What-If Analysis
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Decision factors */}
        <div className="panel p-6">
          <div className="mb-4 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-accent-300" />
            <h2 className="text-base font-semibold text-white">Decision factors</h2>
          </div>
          <div className="space-y-2.5">
            <Factor
              label="Forecast movement"
              value={f ? fmtPct(f.expected_change_pct) : "—"}
              tone={f ? changeTone(f.expected_change_pct) : ""}
            />
            <Factor
              label="Confidence"
              value={f ? `${f.confidence.toFixed(1)}%` : "—"}
              tone="text-success-400"
            />
            <Factor label="Current rate" value={f ? `$${f.current_rate.toFixed(2)}` : "—"} />
            <Factor
              label="Future rate"
              value={f ? `$${f.predicted_rate.toFixed(2)}` : "—"}
              tone="text-accent-300"
            />
            <Factor label="Risk adjustment" value={activeRisk} tone={riskTone(activeRisk).text} />
          </div>
          {o && (
            <>
              <div className="my-4 divider" />
              <div className="label-mono mb-1.5">Recommended</div>
              <div className="text-lg font-semibold text-accent-300">{o.recommended}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`num text-sm font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function Factor({
  label,
  value,
  tone = "text-slate-200",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] py-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`num text-sm font-semibold ${tone}`}>{value}</span>
    </div>
  );
}
