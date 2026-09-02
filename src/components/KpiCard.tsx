import { motion } from "framer-motion";
import type { ComponentType, ReactNode } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
  delay = 0,
  isDemo = false,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "positive" | "negative" | "warning" | "accent";
  delay?: number;
  isDemo?: boolean;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  const toneText = {
    neutral: "text-slate-200",
    positive: "text-success-400",
    negative: "text-danger-400",
    warning: "text-warn-400",
    accent: "text-accent-300",
  }[tone];

  const toneIconWrap = {
    neutral: "border-white/10 bg-white/[0.04] text-ink-300",
    positive: "border-success-500/25 bg-success-500/[0.08] text-success-400",
    negative: "border-danger-500/25 bg-danger-500/[0.08] text-danger-400",
    warning: "border-warn-500/25 bg-warn-500/[0.08] text-warn-400",
    accent: "border-accent-500/25 bg-accent-500/[0.08] text-accent-400",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      className="panel relative p-5 transition-colors hover:border-white/[0.12]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="kicker">{label}</span>
        <div className="flex shrink-0 items-center gap-2">
          {isDemo && <span className="text-2xs font-medium text-warn-400">Demo</span>}
          {Icon && (
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${toneIconWrap}`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            </div>
          )}
        </div>
      </div>
      <div className={`mt-3 text-2xl font-semibold tracking-tight ${toneText}`}>{value}</div>
      {sub && <div className="mt-1.5 text-xs text-ink-400">{sub}</div>}
    </motion.div>
  );
}

export function TrendPill({ value }: { value: number }) {
  const up = value > 0;
  const flat = value === 0;
  const tone = flat ? "text-ink-400" : up ? "text-success-400" : "text-danger-400";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium num ${tone}`}>
      {!flat && (up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}
