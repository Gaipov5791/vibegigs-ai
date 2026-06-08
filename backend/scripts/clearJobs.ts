import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function clearJobs() {
  const analyzed = await prisma.analyzedJob.deleteMany();
  const raw = await prisma.rawJob.deleteMany();

  console.log(
    `[clearJobs] Удалено: ${analyzed.count} analyzed, ${raw.count} raw`
  );
}

clearJobs()
  .catch((error) => {
    console.error("[clearJobs] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
