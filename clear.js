const { PrismaClient } = require('./app/generated/prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clearData() {
  const result = await prisma.recordings.deleteMany({});
  console.log(`Deleted ${result.count} recordings.`);
}

clearData()
  .catch(console.error)
  .finally(() => process.exit(0));
