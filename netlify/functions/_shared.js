import { getStore } from "@netlify/blobs";

export async function getDynamicUsers() {
  const store = getStore("mtb-users");
  return (await store.get("list", { type: "json" })) || [];
}

export async function saveDynamicUsers(users) {
  const store = getStore("mtb-users");
  await store.setJSON("list", users);
}

// Resolves a bearer token (which, in this MVP, is simply the account's
// password) back to the account it belongs to. The single Super Admin
// always comes from the MTB_SUPERADMIN_PASSWORD environment variable -
// it is not stored in Blobs and cannot be created or deleted through
// the app. Every other account (admin / judge / staff) lives in Blobs
// and can only be created by someone who is already Super Admin.
export async function resolveToken(token) {
  if (!token) return null;
  const superPass = Netlify.env.get("MTB_SUPERADMIN_PASSWORD");
  if (superPass && token === superPass) {
    return { username: "superadmin", role: "super", name: "Super Admin" };
  }
  const users = await getDynamicUsers();
  const acc = users.find((u) => u.password === token);
  return acc ? { username: acc.username, role: acc.role, name: acc.name } : null;
}

export async function requireRole(token, roles) {
  const acc = await resolveToken(token);
  return acc && roles.includes(acc.role) ? acc : null;
}
