import { schema } from './zenstack/schema';
import { ZenStackClient } from '@zenstackhq/orm';
import { SqlJsDialect } from '@zenstackhq/orm/dialects/sql.js';
import initSqlJs from 'sql.js';

async function main() {
  const db = await seedDatabase();
  const count =await db.user.count()
  console.log(count)
}
main();

async function seedDatabase() {
  const SQL = await initSqlJs();

  // create database client with sql.js dialect
  const db = new ZenStackClient(schema, {
    dialect: new SqlJsDialect({ sqlJs: new SQL.Database() }),
  });

  // push schema to the database (`$pushSchema` is for testing only)
  await db.$pushSchema();
  return db
}
