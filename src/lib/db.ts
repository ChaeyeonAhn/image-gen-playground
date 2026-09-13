import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "playground.db");

let instance: Database.Database | null = null;

/**
 * Next dev 는 모듈을 자주 다시 평가하므로 커넥션을 globalThis 에 캐시한다.
 * 그러지 않으면 HMR 마다 SQLite 핸들이 새로 열려 파일 잠금이 쌓인다.
 */
const globalForDb = globalThis as unknown as { __playgroundDb?: Database.Database };

function migrate(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS generations (
      id          TEXT PRIMARY KEY,
      created_at  INTEGER NOT NULL,
      mode        TEXT NOT NULL,
      provider    TEXT NOT NULL DEFAULT 'ark',
      model       TEXT NOT NULL,
      prompt      TEXT NOT NULL,
      size        TEXT,
      seed        INTEGER,
      watermark   INTEGER NOT NULL DEFAULT 0,
      ref_image   TEXT,
      status      TEXT NOT NULL,
      error       TEXT,
      latency_ms  INTEGER
    );

    CREATE TABLE IF NOT EXISTS images (
      id            TEXT PRIMARY KEY,
      generation_id TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
      idx           INTEGER NOT NULL,
      file_path     TEXT NOT NULL,
      source_url    TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_images_gen ON images(generation_id);
    CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at DESC);
  `);

  // 프로바이더가 하나였던 시절에 만들어진 DB 를 따라잡는다.
  const columns = db.prepare(`PRAGMA table_info(generations)`).all() as Array<{ name: string }>;
  if (!columns.some((c) => c.name === "provider")) {
    db.exec(`ALTER TABLE generations ADD COLUMN provider TEXT NOT NULL DEFAULT 'ark'`);
  }
}

export function getDb(): Database.Database {
  if (globalForDb.__playgroundDb) return globalForDb.__playgroundDb;
  if (instance) return instance;

  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  migrate(db);

  instance = db;
  globalForDb.__playgroundDb = db;
  return db;
}
