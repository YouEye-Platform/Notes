import { query } from "./client";

let migrated = false;

export async function runMigrations(): Promise<void> {
  if (migrated) return;

  await query(`
    CREATE TABLE IF NOT EXISTS folders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3b82f6',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      is_pinned BOOLEAN DEFAULT false,
      is_shared BOOLEAN DEFAULT false,
      share_token TEXT UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Indexes (IF NOT EXISTS for idempotency)
  await query(`CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notes_share_token ON notes(share_token) WHERE share_token IS NOT NULL`);
  await query(`CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id)`);

  // Full-text search
  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='search_vector') THEN
        ALTER TABLE notes ADD COLUMN search_vector TSVECTOR;
      END IF;
    END $$
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_notes_search ON notes USING GIN(search_vector)`);

  await query(`
    CREATE OR REPLACE FUNCTION notes_search_trigger() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector := to_tsvector('english', coalesce(NEW.title,'') || ' ' || coalesce(NEW.content,''));
      RETURN NEW;
    END $$ LANGUAGE plpgsql
  `);

  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='notes_search_update') THEN
        CREATE TRIGGER notes_search_update BEFORE INSERT OR UPDATE ON notes
        FOR EACH ROW EXECUTE FUNCTION notes_search_trigger();
      END IF;
    END $$
  `);

  // --- Tags system ---
  await query(`
    CREATE TABLE IF NOT EXISTS tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6b7280',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id)`);
  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tags_user_name') THEN
        CREATE UNIQUE INDEX idx_tags_user_name ON tags(user_id, name);
      END IF;
    END $$
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
      tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (note_id, tag_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id)`);

  // --- Reminder + note type columns ---
  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='reminder_at') THEN
        ALTER TABLE notes ADD COLUMN reminder_at TIMESTAMPTZ;
      END IF;
    END $$
  `);
  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='note_type') THEN
        ALTER TABLE notes ADD COLUMN note_type TEXT DEFAULT 'text';
      END IF;
    END $$
  `);
  await query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='reminder_sent') THEN
        ALTER TABLE notes ADD COLUMN reminder_sent BOOLEAN DEFAULT false;
      END IF;
    END $$
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_notes_reminder_at ON notes(reminder_at) WHERE reminder_at IS NOT NULL`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notes_note_type ON notes(note_type)`);

  migrated = true;
}
