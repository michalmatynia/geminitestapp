
module.exports = async () => {
  const prisma = global.__PRISMA__;
  if (prisma) {
    await prisma.$disconnect();
  }
};
