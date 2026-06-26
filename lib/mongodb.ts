import { MongoClient } from "mongodb"
import { getMongoConfig } from "@/lib/env"

declare global {
  // eslint-disable-next-line no-var
  var __legalEaseMongoClientPromise: Promise<MongoClient> | undefined
  // eslint-disable-next-line no-var
  var __legalEaseMongoIndexesPromise: Promise<void> | undefined
}

function deriveDatabaseName(uri: string) {
  try {
    const url = new URL(uri)
    const pathname = url.pathname.replace(/^\/+/, "")
    return pathname || "legalEase-db"
  } catch {
    return "legalEase-db"
  }
}

async function getMongoClient() {
  const config = getMongoConfig()

  if (!config) {
    throw new Error("MongoDB is not configured. Add MONGODB_URI to persist user data.")
  }

  if (!global.__legalEaseMongoClientPromise) {
    const client = new MongoClient(config.uri)
    global.__legalEaseMongoClientPromise = client.connect()
  }

  return global.__legalEaseMongoClientPromise
}

async function getRawMongoDb() {
  const config = getMongoConfig()

  if (!config) {
    throw new Error("MongoDB is not configured. Add MONGODB_URI to persist user data.")
  }

  const client = await getMongoClient()
  return client.db(config.dbName ?? deriveDatabaseName(config.uri))
}

async function ensureIndexes() {
  if (!global.__legalEaseMongoIndexesPromise) {
    global.__legalEaseMongoIndexesPromise = (async () => {
      const db = await getRawMongoDb()

      await Promise.all([
        db.collection("conversations").createIndex({ userId: 1, updatedAt: -1 }),
        db.collection("conversationMessages").createIndex({ userId: 1, conversationId: 1, createdAt: 1 }),
        db.collection("artifacts").createIndex({ userId: 1, updatedAt: -1 }),
        db.collection("documents").createIndex({ userId: 1, updatedAt: -1 }),
      ])
    })()
  }

  await global.__legalEaseMongoIndexesPromise
}

export async function getMongoDb() {
  const db = await getRawMongoDb()
  await ensureIndexes()
  return db
}
