import "dotenv/config";
import { PrismaClient } from "./src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const p = new PrismaClient({ adapter });

async function main() {
  // Simulate the full coordinator API flow including auth lookup
  const coords = await p.coordinator.findMany({
    include: { majors: { select: { majorId: true } } }
  });
  
  for (const c of coords) {
    const majorIds = c.majors.map(m => m.majorId);
    const bps = await p.blueprint.findMany({
      where: {
        status: { in: ["SUBMITTED", "APPROVED", "NEEDS_REVISION"] },
        course: { majorId: { in: majorIds } },
      },
      select: { id: true, status: true, title: true },
    });
    console.log("Coordinator:", c.name, "(" + c.id + ")");
    console.log("  majorIds:", majorIds);
    console.log("  blueprints found:", bps.length);
    bps.forEach(b => console.log("    -", b.title, "|", b.status));
    console.log();
  }
  
  // Also check: does the API route even get called?  
  // Test by hitting localhost:3000
  try {
    const res = await fetch("http://localhost:3000/api/coordinator/blueprints");
    console.log("API response status:", res.status);
    const body = await res.json();
    if (res.status === 401) {
      console.log("  -> Unauthorized (no cookie)");
    } else {
      console.log("  -> Returned", Array.isArray(body) ? body.length + " blueprints" : JSON.stringify(body));
    }
  } catch (e: any) {
    console.log("API fetch failed:", e.message);
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
