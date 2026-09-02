import { request } from "./client";

export type ChatResponse = { response: string };

export async function askFreightAI(message: string, context = "") {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, context }),
  });
}
