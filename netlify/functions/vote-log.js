import { requireRole, getVoteLog } from "./_shared.js";

export default async (req) => {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const token = req.headers.get("x-admin-token") || "";
  const acc = await requireRole(token, ["super", "admin"]);
  if (!acc) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // "free" | "gift" | null (all)
  const status = url.searchParams.get("status");
  const limit = Math.min(500, Number(url.searchParams.get("limit")) || 200);

  let log = await getVoteLog();
  if (type) log = log.filter((e) => e.type === type);
  if (status) log = log.filter((e) => e.status === status);
  log = log.slice(0, limit);

  return new Response(JSON.stringify({ ok: true, entries: log }), {
    headers: { "Content-Type": "application/json" }
  });
};

export const config = {
  path: "/api/vote-log"
};
