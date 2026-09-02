import { motion } from "framer-motion";
import { useForecast } from "@/lib/hooks";
import { RouteSelector } from "@/components/RouteSelector";
import { ForecastChart } from "@/components/ForecastChart";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { DemoBadge, LiveBadge, SkeletonBlock, InlineError } from "@/components/states";
import { fmtUsd, fmtPct, changeTone } from "@/lib/format";
import { Brain, Calendar, Gauge, Layers, TrendingUp, HelpCircle } from "lucide-react";
import { useSelection } from "@/app/AppShell";

export function Forecast() {
  const { sel, setSel } = useSelection();
  const q = useForecast(sel);
  const f = q.data;
  const isDemo = !!f?._demo;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Forecast Intelligence
          </h1>
          {isDemo ? <DemoBadge /> : f ? <LiveBadge /> : null}
        </div>
        <p className="text-sm text-slate-400">Model-projected freight rate across horizons.</p>
      </div>

      <div className="panel p-4">
        <RouteSelector value={sel} onChange={setSel} />
      </div>

      {/* Forecast summary stats */}
      {q.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-[92px]" />
          ))}
        </div>
      ) : q.isError ? (
        <InlineError error={q.error} onRetry={() => q.refetch()} />
      ) : f ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            icon={TrendingUp}
            label="Predicted Rate"
            value={fmtUsd(f.predicted_rate)}
            delay={0}
          />
          <StatCard
            icon={Layers}
            label="Lower Bound"
            value={fmtUsd(f.lower_bound)}
            delay={0.06}
            tone="text-success-400"
          />
          <StatCard
            icon={Layers}
            label="Upper Bound"
            value={fmtUsd(f.upper_bound)}
            delay={0.12}
            tone="text-danger-400"
          />
          <StatCard
            icon={Gauge}
            label="Confidence"
            value={`${f.confidence.toFixed(1)}%`}
            delay={0.18}
            tone="text-accent-300"
          />
          <StatCard icon={Brain} label="Model" value={f.model} delay={0.24} />
          <StatCard icon={Calendar} label="As-of Date" value={f.as_of} delay={0.3} />
        </div>
      ) : null}

      {/* Chart */}
      <div className="panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Forecast Chart</h2>
            <p className="text-xs text-slate-500">
              {sel.origin} → {sel.destination} · {sel.vessel} · {sel.horizon}D
            </p>
          </div>
          <span className="chip border-accent-500/30 bg-accent-500/10 text-accent-200">
            <Brain className="h-3 w-3" /> {f?.model ?? "Gradient Boosting"}
          </span>
        </div>
        {q.isLoading ? (
          <SkeletonBlock className="h-[340px] w-full" />
        ) : q.isError ? (
          <InlineError error={q.error} onRetry={() => q.refetch()} />
        ) : f ? (
          <>
            <ForecastChart series={f.series} currentRate={f.current_rate} />
            {isDemo && (
              <p className="mt-3 text-center text-xs text-amber-300/80">
                Illustrative data — backend unavailable.
              </p>
            )}
          </>
        ) : null}
      </div>

      {/* Why this forecast */}
      {f && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="panel p-5"
        >
          <div className="mb-3 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-accent-300" />
            <h2 className="text-base font-semibold text-white">Why this forecast?</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            {f.reason ??
              `The ${f.model} model projects a ${f.expected_change_pct >= 0 ? "rise" : "decline"} of ${fmtPct(Math.abs(f.expected_change_pct))} over ${sel.horizon} days, with ${f.confidence.toFixed(1)}% confidence and a range of ${fmtUsd(f.lower_bound)} to ${fmtUsd(f.upper_bound)}.`}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="Current rate" value={fmtUsd(f.current_rate)} />
            <Mini label="Predicted" value={fmtUsd(f.predicted_rate)} />
            <Mini
              label="Change"
              value={fmtPct(f.expected_change_pct)}
              tone={changeTone(f.expected_change_pct)}
            />
            <Mini
              label="Confidence"
              value={`${f.confidence.toFixed(1)}%`}
              tone="text-success-400"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  delay,
  tone = "text-white",
}: {
  icon: typeof Brain;
  label: string;
  value: string;
  delay: number;
  tone?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="panel p-4"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        <span className="label-mono">{label}</span>
      </div>
      <div className={`mt-2 text-lg font-semibold num ${tone}`}>{value}</div>
    </motion.div>
  );
}

function Mini({
  label,
  value,
  tone = "text-slate-200",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="label-mono">{label}</div>
      <div className={`mt-1 text-sm font-semibold num ${tone}`}>{value}</div>
    </div>
  );
}
