
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = async () => {
  process.env.OTEL_SDK_DISABLED = 'true';
  console.log('Setting up test database...');
  execSync('npx prisma db push --force-reset');
  await prisma.$connect();
  console.log('Test database setup complete.');

  global.__PRISMA__ = prisma;
};
