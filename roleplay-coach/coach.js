// Pure logic for the role play coach: scenarios, prompts, scoring checks, xAPI.
// No DOM and no network here, so it runs in the browser and in `node --test`.

export const SCENARIOS = [
  {
    id: "discovery-call",
    title: "Sales discovery call",
    learnerRole: "Sales rep for ClinicFlow, appointment scheduling software",
    persona: {
      name: "Dana Ortiz",
      role: "Operations manager at a group of 6 dental clinics, 40 staff",
      mood: "Busy and polite, a bit skeptical. A previous scheduling tool was dropped after 3 months because staff hated it.",
      hidden: "No-shows are about 15% of appointments, roughly $9,000 lost a month. Front desk spends 2 hours a day on reminder calls. Any purchase over $500 a month needs the CFO, Ravi. Dana only shares numbers if asked a good open question.",
      opening: "Hi, it's Dana. I have about 15 minutes, so what did you want to cover?"
    },
    goal: "Uncover the real pain with numbers, handle the bad-experience concern, and agree a concrete next step that includes the CFO.",
    passMark: 70,
    rubric: [
      { id: "agenda", name: "Rapport and agenda", weight: 1, good: "Respects the time limit, sets a short agenda, asks permission to ask questions." },
      { id: "discovery", name: "Discovery questions", weight: 3, good: "Open questions that uncover no-shows, the cost and the time spent on reminder calls." },
      { id: "listening", name: "Listening", weight: 2, good: "Summarizes what Dana said in her words and does not pitch features too early." },
      { id: "objection", name: "Handling the past failure", weight: 2, good: "Asks why the old tool failed and connects the answer to staff adoption, without dismissing it." },
      { id: "next-step", name: "Next step", weight: 2, good: "Agrees a dated next step and brings in Ravi, the CFO." }
    ]
  },
  {
    id: "late-order",
    title: "Customer support: late and damaged order",
    learnerRole: "Support agent at an online furniture store",
    persona: {
      name: "Mark Chen",
      role: "Customer, third contact about the same order",
      mood: "Frustrated and short. Two earlier agents promised a call back that never came.",
      hidden: "The table arrived 9 days late with a cracked leg. Mark wants either a replacement leg within a week or a partial refund. He will calm down if someone takes ownership and gives a specific date.",
      opening: "This is the third time I'm contacting you. Nobody called me back. I want this sorted today."
    },
    goal: "Acknowledge the history, take ownership, offer a concrete fix with a date, and confirm the follow-up.",
    passMark: 70,
    rubric: [
      { id: "empathy", name: "Acknowledges the history", weight: 2, good: "Names the missed call backs and apologizes once, specifically." },
      { id: "ownership", name: "Ownership", weight: 2, good: "Says what they personally will do, not what 'the team' might do." },
      { id: "solution", name: "Concrete solution", weight: 3, good: "Offers a replacement part or partial refund with a specific date." },
      { id: "clarity", name: "Clear and calm language", weight: 1, good: "Short sentences, no policy jargon, no blaming the warehouse." },
      { id: "close", name: "Confirms the follow-up", weight: 2, good: "Confirms how and when Mark will hear back, and checks he is OK with it." }
    ]
  }
];

export function validateScenario(s) {
  const errors = [];
  if (!s || typeof s !== "object") return ["Scenario must be an object"];
  for (const key of ["id", "title", "learnerRole", "goal"]) {
    if (typeof s[key] !== "string" || !s[key].trim()) errors.push(`Missing text field: ${key}`);
  }
  const p = s.persona || {};
  for (const key of ["name", "role", "mood", "hidden", "opening"]) {
    if (typeof p[key] !== "string" || !p[key].trim()) errors.push(`Missing persona field: ${key}`);
  }
  if (!Array.isArray(s.rubric) || s.rubric.length === 0) {
    errors.push("Rubric needs at least one criterion");
  } else {
    const ids = new Set();
    s.rubric.forEach((c, i) => {
      if (!c.id || ids.has(c.id)) errors.push(`Rubric item ${i + 1}: id missing or repeated`);
      ids.add(c.id);
      if (!c.name) errors.push(`Rubric item ${i + 1}: name missing`);
      if (!(Number(c.weight) > 0)) errors.push(`Rubric item ${i + 1}: weight must be above 0`);
    });
  }
  if (s.passMark !== undefined && !(s.passMark >= 0 && s.passMark <= 100)) errors.push("passMark must be 0-100");
  return errors;
}

export function actorSystemPrompt(s) {
  const p = s.persona;
  return [
    `You are role playing ${p.name}, ${p.role}, in a training simulation.`,
    `The learner plays: ${s.learnerRole}.`,
    `Your mood and background: ${p.mood}`,
    `Facts you know but only reveal when the learner earns them with good questions: ${p.hidden}`,
    "Stay in character. Reply like a real person on a call: 1 to 3 short sentences, no lists, no stage directions.",
    "Do not coach the learner and do not mention that this is a simulation.",
    "If the learner ends the conversation, say a natural goodbye."
  ].join("\n");
}

export function judgeSystemPrompt(s) {
  const lines = s.rubric.map(c => `- ${c.id} (${c.name}, weight ${c.weight}): ${c.good}`);
  return [
    "You are a strict, fair sales and service coach scoring a role play transcript.",
    `Scenario: ${s.title}. Learner role: ${s.learnerRole}. Goal: ${s.goal}`,
    "Score every criterion from 1 (missing) to 5 (excellent):",
    ...lines,
    "For each criterion quote one exact line the learner said that justifies the score, copied word for word from the transcript.",
    "If the learner never did it, set evidence to an empty string and score 1.",
    "Give one practical tip per criterion, written to the learner as 'you'.",
    "Return only data that matches the schema."
  ].join("\n");
}

export function transcriptText(turns, s) {
  const who = { learner: "Learner", persona: s.persona.name };
  return turns.map(t => `${who[t.role] || t.role}: ${t.text}`).join("\n");
}

export function judgeSchema(s) {
  return {
    type: "object",
    properties: {
      criteria: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", enum: s.rubric.map(c => c.id) },
            score: { type: "integer" },
            evidence: { type: "string" },
            tip: { type: "string" }
          },
          required: ["id", "score", "evidence", "tip"],
          additionalProperties: false
        }
      },
      strengths: { type: "array", items: { type: "string" } },
      next_practice: { type: "array", items: { type: "string" } },
      summary: { type: "string" }
    },
    required: ["criteria", "strengths", "next_practice", "summary"],
    additionalProperties: false
  };
}

const norm = str => String(str || "").toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();

// Checks the judge output instead of trusting it: every criterion once, scores in range,
// evidence quotes really said by the learner. Anything off goes to human review.
export function parseJudge(text, s, turns) {
  let data;
  try {
    data = typeof text === "string" ? JSON.parse(text) : text;
  } catch (e) {
    const m = typeof text === "string" && text.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, error: "Scoring reply was not JSON. Sent to human review." };
    try { data = JSON.parse(m[0]); } catch (e2) { return { ok: false, error: "Scoring reply was not valid JSON. Sent to human review." }; }
  }
  if (!data || !Array.isArray(data.criteria)) return { ok: false, error: "Scoring reply has no criteria list. Sent to human review." };
  const learnerLines = norm(turns.filter(t => t.role === "learner").map(t => t.text).join(" \n "));
  const byId = new Map();
  const warnings = [];
  for (const c of data.criteria) {
    if (byId.has(c.id)) return { ok: false, error: `Criterion "${c.id}" scored twice. Sent to human review.` };
    byId.set(c.id, c);
  }
  const criteria = [];
  for (const r of s.rubric) {
    const c = byId.get(r.id);
    if (!c) return { ok: false, error: `Criterion "${r.name}" is missing. Sent to human review.` };
    if (!Number.isInteger(c.score) || c.score < 1 || c.score > 5) return { ok: false, error: `Score for "${r.name}" is outside 1-5. Sent to human review.` };
    const quoted = norm(c.evidence).replace(/^"|"$/g, "");
    const found = quoted === "" || learnerLines.includes(quoted);
    if (!found) warnings.push(`Quote for "${r.name}" is not in the transcript, check it by hand.`);
    criteria.push({ ...r, score: c.score, evidence: c.evidence || "", tip: c.tip || "", quoteFound: found });
  }
  return {
    ok: true,
    warnings,
    criteria,
    score: weightedScore(criteria),
    strengths: Array.isArray(data.strengths) ? data.strengths : [],
    nextPractice: Array.isArray(data.next_practice) ? data.next_practice : [],
    summary: data.summary || ""
  };
}

export function weightedScore(criteria) {
  const total = criteria.reduce((a, c) => a + Number(c.weight), 0);
  if (!total) return 0;
  const got = criteria.reduce((a, c) => a + Number(c.weight) * (c.score - 1) / 4, 0);
  return Math.round((got / total) * 100);
}

function isoDuration(ms) {
  const sec = Math.max(0, Math.round(ms / 1000));
  return `PT${Math.floor(sec / 60)}M${sec % 60}S`;
}

// xAPI statement an LMS or LRS can store. The URLs under example.com are placeholders
// that a real install replaces with the client's own activity IDs.
export function toXapi({ learnerName, learnerEmail, scenario, result, startedAt, endedAt }) {
  const pass = scenario.passMark ?? 70;
  return {
    actor: { objectType: "Agent", name: learnerName, mbox: `mailto:${learnerEmail}` },
    verb: { id: "http://adlnet.gov/expapi/verbs/completed", display: { "en-US": "completed" } },
    object: {
      objectType: "Activity",
      id: `https://example.com/roleplay/${scenario.id}`,
      definition: { name: { "en-US": scenario.title }, type: "http://adlnet.gov/expapi/activities/simulation" }
    },
    result: {
      score: { scaled: result.score / 100, raw: result.score, min: 0, max: 100 },
      success: result.score >= pass,
      completion: true,
      duration: isoDuration(new Date(endedAt) - new Date(startedAt))
    },
    context: {
      extensions: {
        "https://example.com/xapi/rubric": Object.fromEntries(result.criteria.map(c => [c.id, c.score]))
      }
    },
    timestamp: new Date(endedAt).toISOString()
  };
}
