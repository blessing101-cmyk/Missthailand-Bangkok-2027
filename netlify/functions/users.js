import { getDynamicUsers, saveDynamicUsers, requireRole } from "./_shared.js";

export default async (req) => {
  const token = req.headers.get("x-admin-token") || "";

  if (req.method === "GET") {
    if (!(await requireRole(token, ["super"]))) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
    }
    const users = await getDynamicUsers();
    const safe = users.map((u) => ({ username: u.username, role: u.role, name: u.name }));
    return new Response(JSON.stringify({ ok: true, users: safe }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (req.method === "POST") {
    if (!(await requireRole(token, ["super"]))) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
    }
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }
    const { username, password, name, role } = body || {};
    if (!username || !password || !["admin", "judge", "staff"].includes(role)) {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }
    if (username === "superadmin") {
      return new Response(JSON.stringify({ ok: false, error: "reserved_username" }), { status: 400 });
    }
    const users = await getDynamicUsers();
    if (users.some((u) => u.username === username)) {
      return new Response(JSON.stringify({ ok: false, error: "username_taken" }), { status: 409 });
    }
    users.push({ username, password, name: name || username, role });
    await saveDynamicUsers(users);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  if (req.method === "DELETE") {
    if (!(await requireRole(token, ["super"]))) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
    }
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }
    const { username } = body || {};
    if (!username) {
      return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
    }
    let users = await getDynamicUsers();
    users = users.filter((u) => u.username !== username);
    await saveDynamicUsers(users);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = {
  path: "/api/users"
};
