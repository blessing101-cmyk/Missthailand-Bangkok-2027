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

  const accounts = [
    { u: "superadmin", p: Netlify.env.get("MTB_SUPERADMIN_PASSWORD"), role: "super", name: "Maxaiyawat (Super Admin)" },
    { u: "admin",      p: Netlify.env.get("MTB_ADMIN_PASSWORD"),      role: "admin", name: "Admin" },
    { u: "judge1",     p: Netlify.env.get("MTB_JUDGE_PASSWORD"),      role: "judge", name: "Judge" },
    { u: "staff1",     p: Netlify.env.get("MTB_STAFF_PASSWORD"),      role: "staff", name: "Content Staff" }
  ];

  const acc = accounts.find((a) => a.u === username && a.p && a.p === password);
  if (!acc) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_credentials" }), { status: 401 });
  }

  // NOTE (MVP limitation): we return the password itself back as a bearer
  // token for the admin APIs to check against (see applications.js). This
  // is simple but not a real session/JWT system - good enough to replace
  // the old "password hardcoded in the browser" demo, not final-grade auth.
  return new Response(JSON.stringify({ ok: true, role: acc.role, name: acc.name, token: acc.p }), {
    headers: { "Content-Type": "application/json" }
  });
};

export const config = {
  path: "/api/admin-login"
};
