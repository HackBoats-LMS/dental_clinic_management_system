import 'dotenv/config';
import { Client } from 'pg';
import crypto from 'crypto';

async function main() {
  console.log('Connecting to database directly...');
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Seed Admin
    const adminEmail = 'akhilrajuvysyaraju@gmail.com';
    const checkAdmin = await client.query('SELECT * FROM "Admin" WHERE email = $1', [adminEmail]);
    
    if (checkAdmin.rows.length === 0) {
      await client.query(
        'INSERT INTO "Admin" ("adminId", "name", "email", "phone") VALUES ($1, $2, $3, $4)',
        [crypto.randomUUID(), 'Akhil Admin', adminEmail, '1234567890']
      );
      console.log(`Added Admin: ${adminEmail}`);
    } else {
      console.log(`Admin already exists: ${adminEmail}`);
    }

    // Seed Receptionist
    const receptionistEmail = 'akhil031215n@gmail.com';
    const checkReceptionist = await client.query('SELECT * FROM "Receptionist" WHERE email = $1', [receptionistEmail]);

    if (checkReceptionist.rows.length === 0) {
      await client.query(
        'INSERT INTO "Receptionist" ("receptionistId", "name", "email", "phone") VALUES ($1, $2, $3, $4)',
        [crypto.randomUUID(), 'Akhil Receptionist', receptionistEmail, '1234567890']
      );
      console.log(`Added Receptionist: ${receptionistEmail}`);
    } else {
      console.log(`Receptionist already exists: ${receptionistEmail}`);
    }

    console.log('Seeding complete!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await client.end();
  }
}

main();
