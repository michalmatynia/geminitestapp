import prisma from "./lib/prisma";

async function main() {
  try {
    const count = await prisma.user.count();
    console.log("User count:", count);
    const users = await prisma.user.findMany({ select: { email: true } });
    console.log("Users:", users);
  } catch (error) {
    console.error("Error checking users:", error);
  } finally {
    process.exit();
  }
}

main();
