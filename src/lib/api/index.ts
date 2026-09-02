// Barrel for the whole API layer.
import { request, BASE, ApiClientError, probeBackend } from "./client";
import { getForecast, getForecastHistory } from "./forecast";
import { getRoutes, getSummary, getEda } from "./market";
import { postWhatIf, getScenariosHistory } from "./whatif";
import { getOptimize } from "./optimization";
import { getRecommendationsHistory } from "./charter";
import { getModelRuns } from "./models";
import { listPorts } from "./ports";
import { listVessels } from "./vessels";
import { askFreightAI } from "./chat";
import type { HealthResponse } from "../types";

export { ApiClientError, probeBackend, askFreightAI };
export * from "./ports";
export * from "./vessels";
export * from "./feasibility";
export * from "./congestion";
export * from "./voyage";
export * from "./integrated";
export const apiOrigins = async () => request<{ origins: import("../types").BackendOrigin[] }>("/api/maritime/origins");

export const api = {
  base: BASE,
  health: () => request<HealthResponse>("/health"),
  routes: getRoutes,
  summary: getSummary,
  eda: getEda,
  forecast: getForecast,
  forecastHistory: getForecastHistory,
  whatif: postWhatIf,
  optimize: getOptimize,
  recommendationsHistory: getRecommendationsHistory,
  scenariosHistory: getScenariosHistory,
  modelRuns: getModelRuns,
  origins: async () => (await apiOrigins()).origins,
  listPorts,
  listVessels,
  chat: askFreightAI,
};
