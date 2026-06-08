import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function clearFreelancehuntJobs() {
  const deleted = await prisma.rawJob.deleteMany({
    where: { platform: "Freelancehunt" },
  });

  console.log(
    `[clearFreelancehuntJobs] Удалено ${deleted.count} заказов Freelancehunt (AnalyzedJob — каскадом).`
  );
}

clearFreelancehuntJobs()
  .catch((error) => {
    console.error("[clearFreelancehuntJobs] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
