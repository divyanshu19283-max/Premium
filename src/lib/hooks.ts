// TanStack Query hooks with live backend and deterministic demo fallback.
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { api, ApiClientError, getIntegratedDecision, getMarketSignals } from "./api";
import { DEMO_SUMMARY, DEMO_EDA, buildDemoForecast, buildDemoWhatIf, DEMO_OPTIMIZE, DEMO_RECOMMENDATIONS, DEMO_SCENARIOS, DEMO_MODEL_RUNS, DEMO_FORECAST_HISTORY } from "./demo";
import type { RoutesResponse, DataSummary, EDAStats, ForecastResult, WhatIfInput, WhatIfResult, OptimizeResult, RecommendationHistoryItem, ScenarioHistoryItem, ModelRun, ForecastHistoryItem, IntegratedDecisionResult } from "./types";

// Production uses the real FastAPI service. Demo fallback remains available if the service is temporarily unavailable.
const DEMO_MODE = false;

const DEMO_ROUTES: RoutesResponse = {
  routes: [
    { origin: "AUSTRALIA", destinations: ["EAST COAST INDIA", "CHINA"] },
    { origin: "BRAZIL", destinations: ["EAST COAST INDIA", "CHINA"] },
    { origin: "USA", destinations: ["WEST COAST INDIA", "CHINA"] },
    { origin: "SOUTH AFRICA", destinations: ["EAST COAST INDIA"] },
    { origin: "INDONESIA", destinations: ["EAST COAST INDIA"] },
  ],
  vessel_types: ["PANAMAX", "HANDYSIZE", "SUPRAMAX", "CAPE"],
  combinations: [
    { origin: "AUSTRALIA", destination: "EAST COAST INDIA", vessel_type: "PANAMAX", rows: 1820 },
    { origin: "AUSTRALIA", destination: "EAST COAST INDIA", vessel_type: "CAPE", rows: 980 },
    { origin: "AUSTRALIA", destination: "CHINA", vessel_type: "CAPE", rows: 980 },
    { origin: "BRAZIL", destination: "EAST COAST INDIA", vessel_type: "CAPE", rows: 1640 },
    { origin: "BRAZIL", destination: "CHINA", vessel_type: "PANAMAX", rows: 860 },
    { origin: "USA", destination: "WEST COAST INDIA", vessel_type: "SUPRAMAX", rows: 1410 },
    { origin: "USA", destination: "CHINA", vessel_type: "PANAMAX", rows: 720 },
    { origin: "SOUTH AFRICA", destination: "EAST COAST INDIA", vessel_type: "HANDYSIZE", rows: 1280 },
    { origin: "INDONESIA", destination: "EAST COAST INDIA", vessel_type: "PANAMAX", rows: 1120 },
  ],
};

const isOffline = (e: unknown) => e instanceof ApiClientError && (e.kind === "offline" || e.kind === "unknown" || e.kind === "server");

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => DEMO_MODE ? ({ status: "healthy", database: "connected", model_loaded: true, version: "Demo v1.0" }) : api.health(),
    refetchInterval: DEMO_MODE ? false : 30000,
    retry: 0,
    staleTime: 15000,
  });
}

export function useRoutes() {
  return useQuery<RoutesResponse>({
    queryKey: ["routes"],
    queryFn: async () => {
      if (DEMO_MODE) return DEMO_ROUTES;
      try { return await api.routes(); } catch (e) { if (isOffline(e)) return DEMO_ROUTES; throw e; }
    }, retry: 0, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
  });
}

export function useSummary() {
  return useQuery<DataSummary & { _demo?: boolean }>({
    queryKey: ["summary"],
    queryFn: async () => {
      if (DEMO_MODE) return { ...DEMO_SUMMARY, _demo: true };
      try { return await api.summary(); } catch (e) { if (isOffline(e)) return { ...DEMO_SUMMARY, _demo: true }; throw e; }
    }, retry: 0, staleTime: 60000,
  });
}

export function useEda() {
  return useQuery<EDAStats & { _demo?: boolean }>({
    queryKey: ["eda"],
    queryFn: async () => {
      if (DEMO_MODE) return { ...DEMO_EDA, _demo: true };
      try { return await api.eda(); } catch (e) { if (isOffline(e)) return { ...DEMO_EDA, _demo: true }; throw e; }
    }, retry: 0, staleTime: 60000,
  });
}

function validForecast(body: { origin: string; destination: string; vessel: string; horizon: number } | null) {
  return !!body && !!body.origin?.trim() && !!body.destination?.trim() && !!body.vessel?.trim() && Number.isFinite(body.horizon) && body.horizon > 0;
}

export function useForecast(body: { origin: string; destination: string; vessel: string; horizon: number } | null) {
  const valid = validForecast(body);
  const routesQ = useRoutes();
  const supported = !!body && !!routesQ.data?.combinations?.some(r => r.origin.toLowerCase() === body.origin.toLowerCase() && r.destination.toLowerCase() === body.destination.toLowerCase() && r.vessel_type.toLowerCase() === body.vessel.toLowerCase());
  return useQuery<ForecastResult & { _demo?: boolean }>({
    queryKey: ["forecast", body],
    queryFn: async () => {
      if (!body || !valid) throw new Error("No input");
      if (DEMO_MODE) return { ...buildDemoForecast(body.origin, body.destination, body.vessel, body.horizon), _demo: true };
      try { return await api.forecast(body); } catch (e) { if (isOffline(e)) return { ...buildDemoForecast(body.origin, body.destination, body.vessel, body.horizon), _demo: true }; throw e; }
    }, enabled: valid && (!!routesQ.data && supported), placeholderData: keepPreviousData, retry: 0,
  });
}

export function useForecastHistory() {
  return useQuery<ForecastHistoryItem[]>({ queryKey: ["forecast-history"], queryFn: async () => { if (DEMO_MODE) return DEMO_FORECAST_HISTORY; try { return await api.forecastHistory(); } catch (e) { if (isOffline(e)) return DEMO_FORECAST_HISTORY; throw e; } }, retry: 0 });
}

export function useWhatIf() {
  return useMutation<WhatIfResult & { _demo?: boolean }, ApiClientError, WhatIfInput>({ mutationFn: async input => { if (DEMO_MODE) return { ...buildDemoWhatIf(input), _demo: true }; try { return await api.whatif(input); } catch (e) { if (isOffline(e)) return { ...buildDemoWhatIf(input), _demo: true }; throw e; } }, retry: 0 });
}

export function useOptimize(body: { origin: string; destination: string; vessel: string } | null) {
  const valid = !!body && !!body.origin?.trim() && !!body.destination?.trim() && !!body.vessel?.trim();
  const routesQ = useRoutes();
  const supported = !!body && !!routesQ.data?.combinations?.some(r => r.origin.toLowerCase() === body.origin.toLowerCase() && r.destination.toLowerCase() === body.destination.toLowerCase() && r.vessel_type.toLowerCase() === body.vessel.toLowerCase());
  return useQuery<OptimizeResult & { _demo?: boolean }>({ queryKey: ["optimize", body], queryFn: async () => { if (!body || !valid) throw new Error("Please choose a complete route and vessel selection."); if (DEMO_MODE) return { ...DEMO_OPTIMIZE, origin: body.origin, destination: body.destination, vessel: body.vessel, _demo: true }; try { return await api.optimize(body); } catch (e) { if (isOffline(e)) return { ...DEMO_OPTIMIZE, origin: body.origin, destination: body.destination, vessel: body.vessel, _demo: true }; throw e; } }, enabled: valid && (!!routesQ.data && supported), placeholderData: keepPreviousData, retry: 0 });
}

export function useRecommendationsHistory() { return useQuery<RecommendationHistoryItem[]>({ queryKey: ["recommendations"], queryFn: async () => { if (DEMO_MODE) return DEMO_RECOMMENDATIONS; try { return await api.recommendationsHistory(); } catch (e) { if (isOffline(e)) return DEMO_RECOMMENDATIONS; throw e; } }, retry: 0 }); }
export function useScenariosHistory() { return useQuery<ScenarioHistoryItem[]>({ queryKey: ["scenarios"], queryFn: async () => { if (DEMO_MODE) return DEMO_SCENARIOS; try { return await api.scenariosHistory(); } catch (e) { if (isOffline(e)) return DEMO_SCENARIOS; throw e; } }, retry: 0 }); }
export function useModelRuns() { return useQuery<ModelRun[]>({ queryKey: ["model-runs"], queryFn: async () => { if (DEMO_MODE) return DEMO_MODEL_RUNS; try { return await api.modelRuns(); } catch (e) { if (isOffline(e)) return DEMO_MODEL_RUNS; throw e; } }, retry: 0 }); }
export function useIntegratedDecision() { return useMutation<IntegratedDecisionResult, ApiClientError, Parameters<typeof getIntegratedDecision>[0]>({ mutationFn: input => getIntegratedDecision(input), retry: 0 }); }
export function useMarketSignals(origin?: string, vesselType?: string) { return useQuery({ queryKey: ["market-signals", origin, vesselType], queryFn: () => getMarketSignals(origin, vesselType), retry: 0, staleTime: 60000 }); }
