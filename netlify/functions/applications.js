import { getStore } from "@netlify/blobs";
import { requireRole } from "./_shared.js";

async function isAdminToken(token) {
  return Boolean(await requireRole(token, ["super", "admin"]));
}

export default async (req) => {
  const store = getStore("mtb-applications");

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }
    const id = "MTB-2027-" + Math.floor(1000 + Math.random() * 9000);
    const record = { ...body, id, status: "Submitted", submittedAt: new Date().toISOString() };

    const index = (await store.get("index", { type: "json" })) || [];
    index.push(id);
    await store.setJSON("index", index);
    await store.setJSON(`app:${id}`, record);

    return new Response(JSON.stringify({ ok: true, id }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (req.method === "GET") {
    const token = req.headers.get("x-admin-token") || "";
    if (!(await isAdminToken(token))) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
    }
    const index = (await store.get("index", { type: "json" })) || [];
    const applications = [];
    for (const id of index) {
      const rec = await store.get(`app:${id}`, { type: "json" });
      if (rec) applications.push(rec);
    }
    return new Response(JSON.stringify({ ok: true, applications }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (req.method === "PATCH") {
    const token = req.headers.get("x-admin-token") || "";
    if (!(await isAdminToken(token))) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
    }
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }
    const { id, status } = body || {};
    if (!id || !status) {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }
    const rec = await store.get(`app:${id}`, { type: "json" });
    if (!rec) {
      return new Response(JSON.stringify({ ok: false, error: "not_found" }), { status: 404 });
    }
    rec.status = status;
    await store.setJSON(`app:${id}`, rec);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = {
  path: "/api/applications"
};
