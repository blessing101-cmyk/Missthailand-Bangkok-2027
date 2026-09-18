import { getDynamicUsers } from "./_shared.js";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400 });
  }
  const { username, password } = body || {};

  // The one and only Super Admin - identity comes from an environment
  // variable, not from Blobs, so it can never be created or deleted
  // through the app itself.
  if (username === "superadmin") {
    const superPass = Netlify.env.get("MTB_SUPERADMIN_PASSWORD");
    if (superPass && password === superPass) {
      return new Response(JSON.stringify({ ok: true, role: "super", name: "Super Admin", token: superPass }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ ok: false, error: "invalid_credentials" }), { status: 401 });
  }

  // Everyone else (admin / judge / staff) was created by the Super Admin
  // through the "System Users" tab and lives in Blobs.
  const users = await getDynamicUsers();
  const acc = users.find((u) => u.username === username && u.password === password);
  if (!acc) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_credentials" }), { status: 401 });
  }

  return new Response(JSON.stringify({ ok: true, role: acc.role, name: acc.name, token: acc.password }), {
    headers: { "Content-Type": "application/json" }
  });
};

export const config = {
  path: "/api/admin-login"
};
