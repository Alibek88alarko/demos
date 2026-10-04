// Vercel serverless function: POST /api/subscribe  -> Kit (ConvertKit) API v4
// Env: KIT_API_KEY, and one tag id per style: KIT_TAG_SECURE, KIT_TAG_ANXIOUS, KIT_TAG_AVOIDANT, KIT_TAG_FEARFUL
const KIT = "https://api.kit.com/v4";

async function kit(path, body) {
  const r = await fetch(`${KIT}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Kit-Api-Key": process.env.KIT_API_KEY },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Kit ${path} ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { name, email, style } = req.body || {};
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "valid email required" });
  const tagId = process.env[`KIT_TAG_${String(style || "").toUpperCase()}`];
  try {
    await kit("/subscribers", { email_address: email, first_name: name || "" }); // upsert
    if (tagId) await kit(`/tags/${tagId}/subscribers`, { email_address: email });
    return res.status(200).json({ ok: true, tagged: Boolean(tagId) });
  } catch (e) {
    // The quiz result is never lost: the page keeps it and lets the user retry.
    return res.status(502).json({ error: "subscribe failed", retry: true });
  }
}
