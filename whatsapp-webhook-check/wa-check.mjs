#!/usr/bin/env node
// WhatsApp Cloud API webhook check. Read-only: it only sends GET requests to the Graph API.
// The token is read from an environment variable and is never printed or sent anywhere else.
//
//   WA_TOKEN=...  WABA_ID=...  [PHONE_NUMBER_ID=...]  [APP_ID=...]  [GRAPH_VERSION=v23.0]  node wa-check.mjs
//
// It looks for the four usual reasons why test webhook events arrive but real messages do not:
//   1. the app is not subscribed to this WABA (POST /{waba-id}/subscribed_apps was never called)
//   2. the token has no access to this WABA (error 100, subcode 33 on GET /{waba-id})
//   3. a callback override on the WABA or the phone number sends events somewhere else
//   4. the app is still in Development mode (checked by hand, the token cannot read it)

export const ICON = { ok: "OK  ", warn: "WARN", fail: "FAIL", info: "INFO" };

export async function graph(fetchFn, version, token, path, params = {}) {
  const url = new URL(`https://graph.facebook.com/${version}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetchFn(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const e = body.error || {};
    return { error: { code: e.code, subcode: e.error_subcode, message: e.message || `HTTP ${res.status}` } };
  }
  return { data: body };
}

const isAccessError = (err) => err && err.code === 100 && err.subcode === 33;

export async function runChecks({ fetchFn = fetch, token, wabaId, phoneId, appId, version = "v23.0" }) {
  const out = [];
  const add = (level, title, detail = "", fix = "") => out.push({ level, title, detail, fix });
  const g = (path, params) => graph(fetchFn, version, token, path, params);
  const post = (path) => `curl -X POST "https://graph.facebook.com/${version}/${path}" -H "Authorization: Bearer $WA_TOKEN"`;

  // Token: valid, scopes, and which WABAs it can reach
  const dbg = await g("debug_token", { input_token: token });
  if (dbg.error) {
    add("warn", "Could not inspect the token", dbg.error.message);
  } else {
    const d = dbg.data.data || {};
    if (d.is_valid === false) add("fail", "Token is not valid or has expired", "", "Create a new System User token in Business Settings.");
    const scopes = d.scopes || [];
    for (const s of ["whatsapp_business_management", "whatsapp_business_messaging"]) {
      if (!scopes.includes(s)) add("fail", `Token is missing the ${s} permission`, "",
        "Business Settings > System users > Generate new token, tick both WhatsApp permissions.");
    }
    const granular = (d.granular_scopes || []).find((x) => x.scope === "whatsapp_business_management");
    if (granular && granular.target_ids && !granular.target_ids.includes(wabaId)) {
      add("fail", "Token is not assigned to this WABA", `It can reach: ${granular.target_ids.join(", ") || "no WABA"}`,
        "Business Settings > System users > Assign assets > WhatsApp accounts > this WABA (full control), then generate a new token.");
    } else if (scopes.length) {
      add("ok", "Token is valid and has both WhatsApp permissions");
    }
  }

  // WABA itself: 100/33 here is the classic "token cannot see this account"
  const waba = await g(wabaId, { fields: "id,name" });
  if (waba.error) {
    add("fail", `GET /${wabaId} failed: ${waba.error.message}`,
      isAccessError(waba.error) ? "Error 100/33 means this ID does not exist for this token or the token has no access to it. Check that WABA_ID is the WhatsApp Business Account ID (not the phone number ID or the app ID) and that the token is assigned to it." : "",
      "");
    return out; // nothing below can work without access to the WABA
  }
  add("ok", `WABA reachable: ${waba.data.name || waba.data.id}`);

  // 1. App subscription to this WABA
  const subs = await g(`${wabaId}/subscribed_apps`);
  if (subs.error) {
    add("warn", "Could not read subscribed apps", subs.error.message);
  } else {
    const apps = subs.data.data || [];
    const names = apps.map((a) => (a.whatsapp_business_api_data || {}).name || (a.whatsapp_business_api_data || {}).id);
    const mine = appId ? apps.find((a) => (a.whatsapp_business_api_data || {}).id === appId) : apps[0];
    if (!apps.length) {
      add("fail", "No app is subscribed to this WABA",
        "The webhook field subscription in the App Dashboard is not enough: the app also has to be subscribed to the WABA, otherwise only dashboard test events arrive.",
        post(`${wabaId}/subscribed_apps`));
    } else if (appId && !mine) {
      add("fail", "Your app is not subscribed to this WABA", `Subscribed apps: ${names.join(", ")}`, post(`${wabaId}/subscribed_apps`));
    } else {
      add("ok", `Subscribed apps: ${names.join(", ")}`);
    }
    for (const a of apps) {
      if (a.override_callback_uri) {
        add("warn", "WABA-level callback override is set", `Events for this WABA go to ${a.override_callback_uri}`,
          "If that is not your Vercel endpoint, subscribe again without override_callback_uri.");
      }
    }
  }

  // 3. Phone numbers: status and phone-level overrides
  const nums = await g(`${wabaId}/phone_numbers`, { fields: "id,display_phone_number,verified_name,status,platform_type" });
  const list = nums.error ? [] : nums.data.data || [];
  if (nums.error) add("warn", "Could not list phone numbers", nums.error.message);
  for (const n of list) {
    if (phoneId && n.id !== phoneId) continue;
    const label = `${n.display_phone_number || n.id} (${n.verified_name || "no name"})`;
    if (n.platform_type && n.platform_type !== "CLOUD_API") {
      add("fail", `${label} is not on Cloud API (platform_type ${n.platform_type})`, "",
        "Register the number for Cloud API: POST /{phone-number-id}/register with your 6-digit PIN.");
    }
    if (n.status && n.status !== "CONNECTED") add("warn", `${label} status is ${n.status}`);
    const wc = await g(n.id, { fields: "webhook_configuration" });
    const cfg = (wc.data || {}).webhook_configuration;
    if (cfg && (cfg.phone_number || cfg.whatsapp_business_account)) {
      add("warn", `${label} has a callback override`, `Effective callback: ${cfg.phone_number || cfg.whatsapp_business_account}`,
        "If this URL is not yours (often a previous provider), remove or replace the override for this number only.");
    } else if (cfg) {
      add("ok", `${label}: events go to the app callback ${cfg.application || ""}`.trim());
    }
  }
  if (phoneId && !list.some((n) => n.id === phoneId) && !nums.error) {
    add("fail", `Phone number ${phoneId} is not in this WABA`, "Real messages to it will never reach this WABA's subscriptions.");
  }

  // 4. Development mode cannot be read with this token
  add("info", "Check App Mode by hand", "App Dashboard top bar: the app should be Live. In Development mode only dashboard test events are delivered.");
  return out;
}

export function render(results) {
  return results.map((r) => [`[${ICON[r.level]}] ${r.title}`, r.detail && `       ${r.detail}`, r.fix && `       Fix: ${r.fix}`]
    .filter(Boolean).join("\n")).join("\n");
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("wa-check.mjs");
if (isMain) {
  const { WA_TOKEN: token, WABA_ID: wabaId, PHONE_NUMBER_ID: phoneId, APP_ID: appId, GRAPH_VERSION: version } = process.env;
  if (!token || !wabaId) {
    console.error("Set WA_TOKEN and WABA_ID (optional: PHONE_NUMBER_ID, APP_ID, GRAPH_VERSION). Nothing is changed, only GET requests are sent.");
    process.exit(2);
  }
  const results = await runChecks({ token, wabaId, phoneId, appId, version: version || "v23.0" });
  console.log(render(results));
  process.exit(results.some((r) => r.level === "fail") ? 1 : 0);
}
