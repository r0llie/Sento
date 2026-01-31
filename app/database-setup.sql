-- ============================================
-- Sento - Complete Database Setup
-- Run this ONCE in Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- ============================================

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Invoices table (with team support)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  amount BIGINT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'unpaid',
  team_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  tx_signature TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_wallet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  wallet TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'creator')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, wallet)
);

-- Batch payments table (main batch record)
CREATE TABLE IF NOT EXISTS batch_payments (
  id TEXT PRIMARY KEY,
  creator_wallet TEXT NOT NULL,
  team_id TEXT,
  total_amount BIGINT NOT NULL,
  proof_hash TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'partial')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Batch recipients table (individual payments in a batch)
CREATE TABLE IF NOT EXISTS batch_recipients (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES batch_payments(id) ON DELETE CASCADE,
  wallet TEXT NOT NULL,
  amount BIGINT NOT NULL,
  note TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed')),
  tx_signature TEXT,
  error TEXT
);

-- ============================================
-- 2. CREATE INDEXES (for performance)
-- ============================================

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_sender ON invoices(sender);
CREATE INDEX IF NOT EXISTS idx_invoices_recipient ON invoices(recipient);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_team_id ON invoices(team_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_owner_wallet ON teams(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_team_members_wallet ON team_members(wallet);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);

-- Batch payments indexes
CREATE INDEX IF NOT EXISTS idx_batch_payments_creator ON batch_payments(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_batch_payments_team ON batch_payments(team_id);
CREATE INDEX IF NOT EXISTS idx_batch_payments_status ON batch_payments(status);
CREATE INDEX IF NOT EXISTS idx_batch_payments_created_at ON batch_payments(created_at DESC);

-- Batch recipients indexes
CREATE INDEX IF NOT EXISTS idx_batch_recipients_batch ON batch_recipients(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_recipients_wallet ON batch_recipients(wallet);
CREATE INDEX IF NOT EXISTS idx_batch_recipients_status ON batch_recipients(status);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_recipients ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE POLICIES
-- ⚠️ WARNING: MVP/Development - Public Access
-- For Production: Replace with wallet-based auth
-- ============================================

-- Drop existing policies (for clean re-run)
DROP POLICY IF EXISTS "Public read access" ON invoices;
DROP POLICY IF EXISTS "Public insert access" ON invoices;
DROP POLICY IF EXISTS "Public update access" ON invoices;
DROP POLICY IF EXISTS "Public delete access" ON invoices;

DROP POLICY IF EXISTS "Anyone can read teams" ON teams;
DROP POLICY IF EXISTS "Anyone can insert teams" ON teams;
DROP POLICY IF EXISTS "Anyone can update teams" ON teams;
DROP POLICY IF EXISTS "Anyone can delete teams" ON teams;

DROP POLICY IF EXISTS "Anyone can read team members" ON team_members;
DROP POLICY IF EXISTS "Anyone can insert team members" ON team_members;
DROP POLICY IF EXISTS "Anyone can update team members" ON team_members;
DROP POLICY IF EXISTS "Anyone can delete team members" ON team_members;

DROP POLICY IF EXISTS "Anyone can read batch payments" ON batch_payments;
DROP POLICY IF EXISTS "Anyone can insert batch payments" ON batch_payments;
DROP POLICY IF EXISTS "Anyone can update batch payments" ON batch_payments;
DROP POLICY IF EXISTS "Anyone can delete batch payments" ON batch_payments;

DROP POLICY IF EXISTS "Anyone can read batch recipients" ON batch_recipients;
DROP POLICY IF EXISTS "Anyone can insert batch recipients" ON batch_recipients;
DROP POLICY IF EXISTS "Anyone can update batch recipients" ON batch_recipients;
DROP POLICY IF EXISTS "Anyone can delete batch recipients" ON batch_recipients;

-- Invoices policies
CREATE POLICY "Public read access" ON invoices FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON invoices FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON invoices FOR DELETE USING (true);

-- Teams policies
CREATE POLICY "Anyone can read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Anyone can insert teams" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update teams" ON teams FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete teams" ON teams FOR DELETE USING (true);

-- Team members policies
CREATE POLICY "Anyone can read team members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Anyone can insert team members" ON team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update team members" ON team_members FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete team members" ON team_members FOR DELETE USING (true);

-- Batch payments policies
CREATE POLICY "Anyone can read batch payments" ON batch_payments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert batch payments" ON batch_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update batch payments" ON batch_payments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete batch payments" ON batch_payments FOR DELETE USING (true);

-- Batch recipients policies
CREATE POLICY "Anyone can read batch recipients" ON batch_recipients FOR SELECT USING (true);
CREATE POLICY "Anyone can insert batch recipients" ON batch_recipients FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update batch recipients" ON batch_recipients FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete batch recipients" ON batch_recipients FOR DELETE USING (true);

-- ============================================
-- 5. VERIFICATION (Check if everything worked)
-- ============================================

-- Check tables (should return 5 rows)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('invoices', 'teams', 'team_members', 'batch_payments', 'batch_recipients')
ORDER BY table_name;

-- Check RLS enabled (all should be true)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('invoices', 'teams', 'team_members', 'batch_payments', 'batch_recipients')
ORDER BY tablename;

-- Check policies (should be 20 total: 4 per table × 5 tables)
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('invoices', 'teams', 'team_members', 'batch_payments', 'batch_recipients')
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- ✅ SETUP COMPLETE!
-- ============================================
-- 
-- Expected results:
-- ✓ 5 tables created
-- ✓ All tables have RLS enabled
-- ✓ 20 policies created (4 per table)
-- ✓ All indexes created for performance
-- 
-- Next steps:
-- 1. Add env vars to .env.local (see docs/SUPABASE.md)
-- 2. Restart your dev server
-- 3. Test the app - should NOT see localStorage warnings
-- 
-- ============================================
