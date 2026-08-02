import { open } from '@op-engineering/op-sqlite';

export interface BackupRecord {
  id: number;
  description: string;
  createdAt: string;
  values: string; // valori separati da ";"
}

let dbInstance: ReturnType<typeof open> | null = null;
let readySchema: Promise<void> | null = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = open({ name: 'eeprom_manager.db' });
    readySchema = dbInstance
      .execute(
        `CREATE TABLE IF NOT EXISTS backups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          description TEXT NOT NULL,
          created_at TEXT NOT NULL,
          values_csv TEXT NOT NULL
        );`,
      )
      .then(() => undefined);
  }
  return dbInstance;
}

async function ready() {
  getDb();
  await readySchema;
}

function rowToRecord(row: any): BackupRecord {
  return {
    id: row.id,
    description: row.description,
    createdAt: row.created_at,
    values: row.values_csv,
  };
}

export function valuesToCsv(values: number[]): string {
  return values.join(';');
}

export function csvToValues(csv: string): number[] {
  return csv
    .split(';')
    .map(v => v.trim())
    .filter(v => v.length > 0)
    .map(v => parseInt(v, 10));
}

export async function insertBackup(description: string, values: number[]): Promise<BackupRecord> {
  await ready();
  const db = getDb();
  const createdAt = new Date().toISOString();
  const valuesCsv = valuesToCsv(values);
  const result = await db.execute(
    'INSERT INTO backups (description, created_at, values_csv) VALUES (?, ?, ?)',
    [description, createdAt, valuesCsv],
  );
  return { id: result.insertId as number, description, createdAt, values: valuesCsv };
}

export async function listBackups(): Promise<BackupRecord[]> {
  await ready();
  const db = getDb();
  const result = await db.execute('SELECT * FROM backups ORDER BY created_at DESC');
  return result.rows.map(rowToRecord);
}

export async function getBackup(id: number): Promise<BackupRecord | null> {
  await ready();
  const db = getDb();
  const result = await db.execute('SELECT * FROM backups WHERE id = ?', [id]);
  if (result.rows.length === 0) return null;
  return rowToRecord(result.rows[0]);
}

export async function updateBackupValues(
  id: number,
  description: string,
  values: number[],
): Promise<void> {
  await ready();
  const db = getDb();
  await db.execute('UPDATE backups SET description = ?, values_csv = ? WHERE id = ?', [
    description,
    valuesToCsv(values),
    id,
  ]);
}

export async function deleteBackup(id: number): Promise<void> {
  await ready();
  const db = getDb();
  await db.execute('DELETE FROM backups WHERE id = ?', [id]);
}
