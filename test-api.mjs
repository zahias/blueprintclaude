const loginRes = await fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@blueprint.edu", password: "admin123" }),
});
console.log("Login:", loginRes.status);
const cookie = loginRes.headers.getSetCookie().find((x) => x.startsWith("admin_token"));
console.log("Got cookie:", !!cookie);
console.log("Cookie value:", cookie?.split(";")[0]?.substring(0, 30) + "...");

// Test GET first
const listRes = await fetch("http://localhost:3000/api/admin/coordinators", {
  headers: { Cookie: cookie.split(";")[0] },
});
console.log("GET coordinators:", listRes.status);
const list = await listRes.json();
console.log("Coordinators count:", list.length);

// Test POST
const unique = Date.now();
const res = await fetch("http://localhost:3000/api/admin/coordinators", {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: cookie.split(";")[0] },
  body: JSON.stringify({ name: "Test Coord", email: `tc${unique}@test.edu`, password: "test123" }),
});
console.log("Create:", res.status);
const text = await res.text();
console.log("Response body:", text);
