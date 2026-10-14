/**
 * Creates the database if missing, syncs all tables, assigns device codes,
 * and seeds the initial super admin. Run once with: npm run db:init
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const keys = require('../../common/keys/keys');
const dbConfig = require('../../common/config/db.config');
const { loadModels } = require('../../common/database/db_model_structure');

async function ensureDatabase() {
  const conn = await mysql.createConnection({
    host: dbConfig.HOST,
    port: dbConfig.PORT,
    user: dbConfig.USER,
    password: dbConfig.PASSWORD,
  });
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbConfig.DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`✔ Database "${dbConfig.DB}" ready`);
  await conn.end();
}

async function main() {
  await ensureDatabase();

  const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.HOST,
    port: dbConfig.PORT,
    dialect: 'mysql',
    logging: false,
  });

  const db = loadModels(sequelize);

  await sequelize.sync({ alter: true });
  console.log('✔ All tables synced');

  // Backfill device codes for any rows missing one
  const devicesWithoutCode = await db.devices.findAll({ where: { device_code: null } });
  for (const d of devicesWithoutCode) {
    // eslint-disable-next-line no-await-in-loop
    await d.update({ device_code: `DVC${1000 + d.id}` });
  }

  // Seed super admin
  if (keys.SEED_ADMIN_EMAIL && keys.SEED_ADMIN_PASSWORD) {
    const existing = await db.admin_users.scope('withPassword').findOne({
      where: { email: keys.SEED_ADMIN_EMAIL },
    });
    if (!existing) {
      await db.admin_users.create({
        name: keys.SEED_ADMIN_NAME,
        email: keys.SEED_ADMIN_EMAIL,
        password_hash: await bcrypt.hash(keys.SEED_ADMIN_PASSWORD, 10),
        role: 'super_admin',
      });
      console.log(`✔ Seeded super admin: ${keys.SEED_ADMIN_EMAIL} / ${keys.SEED_ADMIN_PASSWORD}`);
    } else {
      console.log('• Super admin already exists, skipping seed');
    }
  }

  await sequelize.close();
  console.log('\n✅ Database initialisation complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ db-init failed:', err);
  process.exit(1);
});
