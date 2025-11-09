import { MongoClient } from 'mongodb';
import 'dotenv/config';

const uri = process.env.DB_CONNECTION_URL;
const DB_NAME = process.env.DB_NAME || 'UBLinked';

let client;
let db;

export async function connectToDatabase() {
  if (db) return db;
  client = new MongoClient(uri, { maxPoolSize: 10 });
  await client.connect();
  db = client.db(DB_NAME);
  await db.command({ ping: 1 });
  console.log(`✅ Connected to MongoDB "${DB_NAME}"`);
  return db;
}

export function getDb() {
  if (!db) throw new Error('DB not initialized. Call connectToDatabase() first.');
  return db;
}
