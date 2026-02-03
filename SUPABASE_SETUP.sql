-- ============================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- Go to: Supabase Dashboard > SQL Editor > New Query
-- Paste this entire thing and click "Run"
-- ============================================

-- Create the unsubscribers table
CREATE TABLE IF NOT EXISTS unsubscribers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_unsubscribers_email ON unsubscribers (email);

-- Enable Row Level Security (required by Supabase)
ALTER TABLE unsubscribers ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations using the anon key
-- (Since this is your private tool, we allow full access with the anon key)
CREATE POLICY "Allow full access" ON unsubscribers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Done! Your table is ready.
