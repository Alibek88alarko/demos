// Vercel serverless function: POST /api/chat
// The Anthropic key stays here (env ANTHROPIC_API_KEY); the browser never sees it.
import Anthropic from "@anthropic-ai/sdk";
import { costUSD, makeStore, monthKey, underCap } from "../lib/budget.js";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5"; // owner can switch models via env
const CAP_USD = Number(process.env.MONTHLY_CAP_USD || 20);
const MAX_TURNS = 20;          // per session
const MAX_CHARS = 1000;        // per user message
const store = makeStore();

const SYSTEM = (style) =>
  `You are a warm, practical relationship coach. The user's quiz result is the "${style}" attachment style. ` +
  `Keep replies under 150 words, ask one question at a time, and never diagnose. ` +
  `If the user mentions self-harm or abuse, gently point them to local emergency services or a professional.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { style, messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: "messages required" });
  if (messages.length > MAX_TURNS * 2) return res.status(200).json({ reply: "We've covered a lot! Start a new chat any time.", limited: true });
  const last = messages[messages.length - 1];
  if (last.role !== "user" || typeof last.content !== "string" || last.content.length > MAX_CHARS) {
    return res.status(400).json({ error: `Message must be text up to ${MAX_CHARS} characters` });
  }

  const cap = await underCap(store, CAP_USD);
  if (!cap.ok) return res.status(200).json({ reply: "The coach is resting for the rest of the month. Please check back soon!", capped: true });

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 1024, // hard cap per reply (cost control)
      output_config: { effort: "low" }, // chat route: low effort keeps replies fast and cheap
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // if a safety classifier declines, the API retries on a recommended model
      system: SYSTEM(style || "unknown"),
      messages: messages.map((m) => ({ role: m.role, content: String(m.content) })),
    });

    const spent = await store.add(monthKey(), costUSD(MODEL, response.usage));
    if (response.stop_reason === "refusal") {
      return res.status(200).json({ reply: "I can't help with that one. Want to talk about something else from your quiz result?", spent });
    }
    const reply = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return res.status(200).json({ reply, spent });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(503).json({ error: "busy", retry: true });
    if (error instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: "server key problem" });
    if (error instanceof Anthropic.APIError) return res.status(502).json({ error: `upstream ${error.status}`, retry: true });
    return res.status(500).json({ error: "unexpected", retry: true });
  }
}
