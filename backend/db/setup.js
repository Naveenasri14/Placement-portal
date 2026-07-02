const fs = require('fs');
const path = require('path');
const { Pool, Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5433'),
};

async function ensureDatabaseExists() {
  console.log('Connecting to default postgres database to verify placement_portal database existence...');
  const client = new Client({
    ...dbConfig,
    database: 'postgres'
  });

  try {
    await client.connect();
    const dbName = process.env.DB_NAME || 'placement_portal';
    
    // Check if database exists
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    
    if (res.rowCount === 0) {
      console.log(`Database "${dbName}" does not exist. Creating it now...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('Error verifying/creating database:', err);
    throw err;
  } finally {
    await client.end();
  }
}

async function runSetup() {
  try {
    // 1. Ensure the database exists
    await ensureDatabaseExists();

    // 2. Connect to the target database
    const targetDatabase = process.env.DB_NAME || 'placement_portal';
    console.log(`Connecting to database "${targetDatabase}"...`);
    
    const pool = new Pool({
      ...dbConfig,
      database: targetDatabase
    });

    // 3. Read schema SQL
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

    // 4. Execute schema SQL
    console.log('Creating database tables and constraints...');
    await pool.query(schemaSql);
    console.log('Tables created successfully.');

    // 5. Hash admin password
    const adminEmail = 'admin@college.edu';
    const adminPassword = 'AdminPassword123';
    console.log(`Generating default admin user (${adminEmail} / ${adminPassword})...`);
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // 6. Insert Admin user
    const insertAdminResult = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'admin')
       RETURNING id`,
      [adminEmail, passwordHash]
    );
    const adminId = insertAdminResult.rows[0].id;
    console.log('Admin account created successfully.');

    // 7. Seed Companies
    console.log('Seeding initial companies...');
    const companies = [
      { name: 'Google', website: 'https://careers.google.com', description: 'Tech multinational specializing in internet-related services and products.' },
      { name: 'Microsoft', website: 'https://careers.microsoft.com', description: 'Empowering every person and every organization on the planet to achieve more.' },
      { name: 'Amazon', website: 'https://www.amazon.jobs', description: 'E-commerce, cloud computing, online advertising, digital streaming, and artificial intelligence.' },
      { name: 'Netflix', website: 'https://jobs.netflix.com', description: 'Leading streaming entertainment service.' },
      { name: 'Meta', website: 'https://www.metacareers.com', description: 'Building technologies that help people connect, find communities, and grow businesses.' }
    ];

    for (const company of companies) {
      await pool.query(
        `INSERT INTO companies (name, website, description)
         VALUES ($1, $2, $3)`,
        [company.name, company.website, company.description]
      );
    }
    console.log('Companies seeded successfully.');

    // 8. Log completion in audit logs
    await pool.query(
      `INSERT INTO audit_logs (actor_id, action, description)
       VALUES ($1, $2, $3)`,
      [adminId, 'DB_INITIALIZATION', 'Database schema setup and seeding completed successfully.']
    );

    console.log('Database setup and seeding completed successfully!');
    await pool.end();
  } catch (error) {
    console.error('Error during database setup:', error);
  }
}

runSetup();
