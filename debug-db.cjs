const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.user.count();
    console.log("USER_COUNT=" + count);
    const users = await prisma.user.findMany({
      select: { email: true, passwordHash: true }
    });
    console.log("USERS=" + JSON.stringify(users));
  } catch (e) {
    console.error("DB_ERROR=" + e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
