import test from "node:test";
import assert from "node:assert/strict";
import { runChecks, render } from "./wa-check.mjs";

// Fake Graph API: routes "path?fields" to canned responses
function fakeFetch(routes) {
  return async (url) => {
    const u = new URL(url);
    const key = u.pathname.replace(/^\/v[\d.]+\//, "") + (u.searchParams.get("fields") ? `?${u.searchParams.get("fields")}` : "");
    const hit = routes[key] ?? routes[u.pathname.replace(/^\/v[\d.]+\//, "")];
    const body = hit ?? { error: { code: 100, error_subcode: 33, message: "Unsupported get request" } };
    return { ok: !body.error, status: body.error ? 400 : 200, json: async () => body };
  };
}

const goodToken = { data: { is_valid: true, scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
  granular_scopes: [{ scope: "whatsapp_business_management", target_ids: ["111"] }] } };

test("app not subscribed to the WABA is reported with the fix", async () => {
  const r = await runChecks({ token: "t", wabaId: "111", fetchFn: fakeFetch({
    debug_token: goodToken, "111?id,name": { id: "111", name: "SupDash" },
    "111/subscribed_apps": { data: [] },
    "111/phone_numbers?id,display_phone_number,verified_name,status,platform_type": { data: [] },
  }) });
  const fail = r.find((x) => x.level === "fail");
  assert.match(fail.title, /No app is subscribed/);
  assert.match(fail.fix, /POST .*111\/subscribed_apps/);
});

test("100/33 on the WABA stops early with an explanation", async () => {
  const r = await runChecks({ token: "t", wabaId: "999", fetchFn: fakeFetch({ debug_token: goodToken }) });
  const fail = r.find((x) => x.level === "fail" && /GET \/999/.test(x.title));
  assert.ok(fail);
  assert.match(fail.detail, /100\/33/);
  assert.ok(!r.some((x) => /Subscribed apps/.test(x.title)));
});

test("token assigned to another WABA is caught", async () => {
  const r = await runChecks({ token: "t", wabaId: "222", fetchFn: fakeFetch({ debug_token: goodToken }) });
  assert.ok(r.some((x) => x.level === "fail" && /not assigned to this WABA/.test(x.title)));
});

test("phone-level override and the token never printed", async () => {
  const r = await runChecks({ token: "SECRET", wabaId: "111", fetchFn: fakeFetch({
    debug_token: goodToken, "111?id,name": { id: "111", name: "SupDash" },
    "111/subscribed_apps": { data: [{ whatsapp_business_api_data: { id: "55", name: "SupDash App" } }] },
    "111/phone_numbers?id,display_phone_number,verified_name,status,platform_type": { data: [
      { id: "77", display_phone_number: "+226 70 00 00 00", verified_name: "SupDash", status: "CONNECTED", platform_type: "CLOUD_API" }] },
    "77?webhook_configuration": { webhook_configuration: { phone_number: "https://old-provider.example/hook", application: "https://supdash.vercel.app/api/whatsapp" } },
  }) });
  assert.ok(r.some((x) => x.level === "warn" && /callback override/.test(x.title)));
  assert.ok(!render(r).includes("SECRET"));
});
