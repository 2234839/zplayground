import { schema } from './zenstack/schema';
import { ZenStackClient } from '@zenstackhq/orm';
import { SqlJsDialect } from '@zenstackhq/orm/dialects/sql.js';
import initSqlJs from 'sql.js';

async function main() {
  const db = await seedDatabase();
  // out: 1
  console.log(await db.user.count())

  // out: { _count: { posts: 2 } }
  console.log(await db.post.findFirst({
    select: {
      _count: { select: { post1s: true } }
    }
  }))
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

  const user =
  await db.post.create({
    data:{
      post1s: {
        create: [
          {},
          {}
        ]
      }
    }
  })

  return db
}
