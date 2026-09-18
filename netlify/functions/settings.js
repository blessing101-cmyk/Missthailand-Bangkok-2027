import { getStore } from "@netlify/blobs";
import { requireRole } from "./_shared.js";

const DEFAULTS = { promptpayId: "", bahtPerVote: 10 };

export default async (req) => {
  const store = getStore("mtb-settings");

  if (req.method === "GET") {
    // Public on purpose: the vote page needs promptpayId/bahtPerVote
    // to build the PromptPay QR code for every visitor.
    const settings = (await store.get("main", { type: "json" })) || {};
    return new Response(JSON.stringify({ ok: true, settings: { ...DEFAULTS, ...settings } }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (req.method === "POST") {
    const token = req.headers.get("x-admin-token") || "";
    const acc = await requireRole(token, ["super", "admin"]);
    if (!acc) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
    }
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }
    const { promptpayId, bahtPerVote } = body || {};
    const settings = {
      promptpayId: promptpayId ? String(promptpayId).replace(/[^0-9]/g, "") : "",
      bahtPerVote: Number(bahtPerVote) > 0 ? Number(bahtPerVote) : 10
    };
    await store.setJSON("main", settings);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = {
  path: "/api/settings"
};
