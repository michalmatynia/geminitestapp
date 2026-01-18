import prisma from "./lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  try {
    const email = "admin@example.com";
    const password = "admin123";
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: "Admin User",
        passwordHash,
      },
    });

    console.log("Admin user ensured:", user.email);
  } catch (error) {
    console.error("Error seeding admin:", error);
  } finally {
    process.exit();
  }
}

main();
