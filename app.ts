import { schema } from './zenstack/schema';
import { ZenStackClient } from '@zenstackhq/orm';
import { SqlJsDialect } from '@zenstackhq/orm/dialects/sql.js';
import initSqlJs from 'sql.js';

async function main() {
  const db = await seedDatabase();
  // out: 1
  console.log(await db.user.count());

  const post = await db.post.create({
    data: {
      replies: {
        create: [{}, {}],
      },
    },
    include: {
      replies: true,
    },
  });
  console.log('[post]', post);
  console.log('======');
  const posts_count = await db.post.findFirst({
    where: { id: post.id },
    include: {
      _count: {
        select: { replies: true },
      },
    },
  });
  console.log('[posts_count]', posts_count);

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

  return db;
}
