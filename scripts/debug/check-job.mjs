import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.productAiJob.findMany({
    where: { type: 'translation' },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  console.log('\n=== Recent Translation Jobs ===');
  for (const job of jobs) {
    console.log(`\nJob ID: ${job.id}`);
    console.log(`Product ID: ${job.productId}`);
    console.log(`Status: ${job.status}`);
    console.log(`Created: ${job.createdAt}`);
    console.log(`Started: ${job.startedAt}`);
    console.log(`Finished: ${job.finishedAt}`);
    if (job.errorMessage) {
      console.log(`Error: ${job.errorMessage}`);
    }
    if (job.result) {
      console.log(`Result:`, JSON.stringify(job.result, null, 2));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
