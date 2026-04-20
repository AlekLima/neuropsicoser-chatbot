import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`specialties\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`name\` varchar(128) NOT NULL,
    \`active\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`specialties_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`professionals\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`name\` varchar(128) NOT NULL,
    \`crp\` varchar(32),
    \`specialtyId\` int NOT NULL,
    \`price\` decimal(10,2),
    \`googleCalendarId\` varchar(256),
    \`active\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`professionals_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`insurance_plans\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`name\` varchar(128) NOT NULL,
    \`active\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`insurance_plans_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`professional_insurance\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`professionalId\` int NOT NULL,
    \`insuranceId\` int NOT NULL,
    CONSTRAINT \`professional_insurance_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`conversations\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`phone\` varchar(32) NOT NULL,
    \`step\` varchar(64) NOT NULL DEFAULT 'start',
    \`data\` json,
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`conversations_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`conversations_phone_unique\` UNIQUE(\`phone\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`appointments\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`phone\` varchar(32) NOT NULL,
    \`patientName\` varchar(128),
    \`professionalId\` int NOT NULL,
    \`specialtyId\` int NOT NULL,
    \`dateTime\` timestamp NOT NULL,
    \`paymentType\` enum('particular','convenio') NOT NULL,
    \`insuranceId\` int,
    \`status\` enum('scheduled','confirmed','cancelled','rescheduled') NOT NULL DEFAULT 'scheduled',
    \`googleEventId\` varchar(256),
    \`reminderSent\` boolean NOT NULL DEFAULT false,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`appointments_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`settings\` (
    \`key\` varchar(64) NOT NULL,
    \`value\` text,
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`settings_key\` PRIMARY KEY(\`key\`)
  )`,
  // Seed default data
  `INSERT IGNORE INTO \`specialties\` (\`name\`) VALUES
    ('Neuropsicologia'),
    ('Fisioterapia'),
    ('Terapia Ocupacional'),
    ('Psicologia'),
    ('Fonoaudiologia'),
    ('Neuropediatria')`,
  `INSERT IGNORE INTO \`insurance_plans\` (\`name\`) VALUES ('ISSEC')`,
  `INSERT IGNORE INTO \`settings\` (\`key\`, \`value\`) VALUES
    ('whatsapp_token', ''),
    ('whatsapp_phone_id', ''),
    ('whatsapp_verify_token', 'neuropsicoser_verify_2024'),
    ('attendant_phone', ''),
    ('google_calendar_credentials', ''),
    ('clinic_address', 'Rua Maria Tomásia, 1355 - Aldeota, Fortaleza - CE, 60150-170'),
    ('clinic_name', 'Neuropsicoser — Saúde Mental e Desenvolvimento')`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log('✓', sql.trim().split('\n')[0].substring(0, 60));
  } catch (e) {
    console.error('✗', e.message);
  }
}

await conn.end();
console.log('\nMigração concluída!');
