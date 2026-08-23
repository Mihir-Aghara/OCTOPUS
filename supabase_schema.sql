-- ===============================================
-- OCTOPUS Cloud Database Table Schema for Supabase
-- Paste this SQL snippet in your Supabase SQL Editor
-- ===============================================

CREATE TABLE IF NOT EXISTS octopus_clips (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'text',
  title TEXT,
  content TEXT NOT NULL,
  is_encrypted BOOLEAN DEFAULT FALSE,
  burn_on_read BOOLEAN DEFAULT FALSE,
  expiration TEXT DEFAULT '24h',
  expire_at BIGINT,
  created_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security (RLS)
ALTER TABLE octopus_clips ENABLE ROW LEVEL SECURITY;

-- Allow public read & write access for zero-friction PIN sharing
CREATE POLICY "Allow public insert" ON octopus_clips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON octopus_clips FOR SELECT USING (true);
CREATE POLICY "Allow public delete" ON octopus_clips FOR DELETE USING (true);

-- High-Performance Database Indexes for Millisecond Lookups at Scale
CREATE INDEX IF NOT EXISTS idx_octopus_clips_expire_at ON octopus_clips (expire_at);
CREATE INDEX IF NOT EXISTS idx_octopus_clips_created_at ON octopus_clips (created_at DESC);

-- Automated Clean Function for Expired Clips
CREATE OR REPLACE FUNCTION delete_expired_clips()
RETURNS void AS $$
BEGIN
  DELETE FROM octopus_clips
  WHERE expire_at IS NOT NULL AND expire_at < (EXTRACT(EPOCH FROM NOW()) * 1000);
END;
$$ LANGUAGE plpgsql;

