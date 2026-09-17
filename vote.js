import { getStore } from "@netlify/blobs";

// Base (seed) vote counts so the tallies don't start at zero.
// These match the demo numbers already shown in the front-end.
const BASE_VOTES = {
  C01: 940, C02: 977, C03: 1014, C04: 1051, C05: 1088,
  C06: 465, C07: 502, C08: 539, C09: 576, C10: 613,
  C11: 650, C12: 687, C13: 724, C14: 761, C15: 798,
  C16: 835, C17: 872, C18: 909, C19: 946, C20: 983
};
const DAILY_FREE_VOTES = 3;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function mergeTallies(tallies) {
  const merged = {};
  for (const id of Object.keys(BASE_VOTES)) {
    merged[id] = BASE_VOTES[id] + (tallies[id] || 0);
  }
  return merged;
}

export default async (req) => {
  const store = getStore("mtb-votes");

  if (req.method === "GET") {
    const tallies = (await store.get("tallies", { type: "json" })) || {};
    return new Response(JSON.stringify({ ok: true, votes: mergeTallies(tallies) }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }
    const { contestantId, deviceId } = body || {};
    if (!contestantId || !Object.prototype.hasOwnProperty.call(BASE_VOTES, contestantId) || !deviceId) {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }

    const quotaKey = `quota:${deviceId}:${todayStr()}`;
    const used = (await store.get(quotaKey, { type: "json" })) || 0;
    if (used >= DAILY_FREE_VOTES) {
      return new Response(JSON.stringify({ ok: false, error: "quota_exceeded", used, dailyFree: DAILY_FREE_VOTES }), { status: 429 });
    }

    const tallies = (await store.get("tallies", { type: "json" })) || {};
    tallies[contestantId] = (tallies[contestantId] || 0) + 1;
    await store.setJSON("tallies", tallies);
    await store.setJSON(quotaKey, used + 1);

    return new Response(JSON.stringify({
      ok: true,
      votes: mergeTallies(tallies),
      used: used + 1,
      dailyFree: DAILY_FREE_VOTES
    }), { headers: { "Content-Type": "application/json" } });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = {
  path: "/api/vote"
};
