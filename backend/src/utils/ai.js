import { GoogleGenAI } from "@google/genai";
import { ApiError } from "./apiError.js";

let client = null;
const getClient = () => {
  if (!process.env.AI_API_KEY) {
    throw new ApiError(503, "AI features are not configured on the server");
  }
  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.AI_API_KEY,
      // Fail fast: 25s per request, and no SDK retries (its default backs off for up to
      // minutes). callModel() does its own quick retry + fallback to other models.
      httpOptions: { timeout: 25000, retryOptions: { attempts: 1 } },
    });
  }
  return client;
};

// Primary model, then fallbacks used when it is overloaded. AI_MODEL overrides the primary.
const models = () => [
  ...new Set([process.env.AI_MODEL || "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"]),
];

const SYSTEM =
  "You are the assistant inside Tasklytic, a personal task and hours tracker. " +
  "Be concise, practical and friendly. Never invent tasks the user did not mention.";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Overloaded / rate limited / temporary server errors are worth retrying
const isTemporary = (err) => {
  const code = err?.status ?? err?.code ?? Number(/"code":\s*(\d+)/.exec(err?.message || "")?.[1]);
  return [429, 500, 503, 504].includes(Number(code)) || /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(err?.message || "");
};

const callModel = async (prompt, config) => {
  let lastError;
  for (const model of models()) {
    // two tries per model, short pause between them
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await getClient().models.generateContent({
          model,
          contents: prompt,
          config: { systemInstruction: SYSTEM, ...config },
        });
        return response.text ?? "";
      } catch (err) {
        if (err instanceof ApiError) throw err;
        lastError = err;
        if (!isTemporary(err)) break; // e.g. model not found: go straight to the next model
        if (attempt === 0) await sleep(800);
      }
    }
  }
  console.error("AI request failed:", lastError?.message || lastError);
  throw new ApiError(502, "The AI service is busy right now. Please try again in a moment.");
};

// Structured output: the model must answer with JSON matching `schema`
export const generateJSON = async (prompt, schema) => {
  const text = await callModel(prompt, {
    responseMimeType: "application/json",
    responseSchema: schema,
    temperature: 0.4,
  });
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(502, "The AI returned an unexpected answer. Please try again.");
  }
};

export const generateText = async (prompt) => (await callModel(prompt, { temperature: 0.7 })).trim();
