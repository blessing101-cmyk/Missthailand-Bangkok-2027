import { getStore } from "@netlify/blobs";
import { requireRole, getVoteLog, saveVoteLog, genId } from "./_shared.js";

function genReference() {
  return "GV-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default async (req) => {
  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }
    const { contestantId, amount, deviceId, note } = body || {};
    const amt = Number(amount);
    if (!contestantId || !deviceId || !amt || amt <= 0) {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }

    const entry = {
      id: genId("G"), type: "gift", contestantId, deviceId,
      amount: amt, reference: genReference(), note: note ? String(note).slice(0, 200) : null,
      votes: null, status: "pending", ts: Date.now(),
      confirmedAt: null, confirmedBy: null
    };
    const log = await getVoteLog();
    log.unshift(entry);
    await saveVoteLog(log);

    return new Response(JSON.stringify({ ok: true, id: entry.id, reference: entry.reference }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (req.method === "PATCH") {
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
    const { id, action } = body || {};
    if (!id || !["confirm", "reject"].includes(action)) {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }

    const log = await getVoteLog();
    const entry = log.find((e) => e.id === id && e.type === "gift");
    if (!entry) {
      return new Response(JSON.stringify({ ok: false, error: "not_found" }), { status: 404 });
    }
    if (entry.status !== "pending") {
      return new Response(JSON.stringify({ ok: false, error: "already_processed" }), { status: 409 });
    }

    if (action === "confirm") {
      const settingsStore = getStore("mtb-settings");
      const settings = (await settingsStore.get("main", { type: "json" })) || {};
      const bahtPerVote = Number(settings.bahtPerVote) || 10;
      const computedVotes = Math.max(1, Math.floor(entry.amount / bahtPerVote));

      entry.status = "confirmed";
      entry.votes = computedVotes;
      entry.confirmedAt = Date.now();
      entry.confirmedBy = acc.username;

      const votesStore = getStore("mtb-votes");
      const tallies = (await votesStore.get("tallies", { type: "json" })) || {};
      tallies[entry.contestantId] = (tallies[entry.contestantId] || 0) + computedVotes;
      await votesStore.setJSON("tallies", tallies);
    } else {
      entry.status = "rejected";
      entry.confirmedAt = Date.now();
      entry.confirmedBy = acc.username;
    }

    await saveVoteLog(log);
    return new Response(JSON.stringify({ ok: true, entry }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = {
  path: "/api/gift-vote"
};
