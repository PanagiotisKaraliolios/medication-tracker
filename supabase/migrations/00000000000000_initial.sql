-- ============================================================================
-- MediTrack — Initial Migration: Full Database Schema
-- ============================================================================
-- This migration represents the complete current state of the database.
-- All tables, indexes, constraints, and RLS policies are defined here.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. profiles
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id),
  full_name       TEXT,
  age             INTEGER,
  updated_at      TIMESTAMPTZ,
  date_of_birth   DATE
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile."
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile."
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. medications
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS medications (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id),
  name                  TEXT        NOT NULL,
  dosage                TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  form                  TEXT        NOT NULL DEFAULT 'tablet'::text,
  icon                  TEXT        NOT NULL DEFAULT 'pill'::text,
  current_supply        INTEGER     NOT NULL DEFAULT 30,
  is_active             BOOLEAN     NOT NULL DEFAULT true,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  low_supply_threshold  INTEGER     NOT NULL DEFAULT 10,
  is_prn                BOOLEAN     DEFAULT false,
  rxcui                 TEXT,
  generic_name          TEXT
);

CREATE INDEX idx_medications_user_id ON medications (user_id);
CREATE INDEX idx_medications_is_prn ON medications (user_id, is_prn) WHERE (is_prn = true);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own medications."
  ON medications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medications."
  ON medications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medications."
  ON medications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own medications."
  ON medications FOR DELETE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. schedules
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schedules (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id       UUID        NOT NULL REFERENCES medications(id),
  user_id             UUID        NOT NULL REFERENCES auth.users(id),
  frequency           TEXT        NOT NULL DEFAULT 'daily'::text,
  selected_days       TEXT[]      DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun']::text[],
  times_of_day        TEXT[]      DEFAULT ARRAY['Morning']::text[],
  dosage_per_dose     INTEGER     NOT NULL DEFAULT 1,
  push_notifications  BOOLEAN     DEFAULT true,
  sms_alerts          BOOLEAN     DEFAULT false,
  snooze_duration     TEXT        NOT NULL DEFAULT '5 min'::text,
  instructions        TEXT        DEFAULT ''::text,
  is_active           BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  start_date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date            DATE,
  interval_days       INTEGER
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules"
  ON schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
  ON schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON schedules FOR DELETE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. dose_logs
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dose_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     UUID        REFERENCES schedules(id),        -- nullable for PRN doses
  medication_id   UUID        NOT NULL REFERENCES medications(id),
  user_id         UUID        NOT NULL REFERENCES auth.users(id),
  scheduled_date  DATE        NOT NULL,
  time_label      TEXT        NOT NULL,
  status          TEXT        NOT NULL CHECK (status IN ('taken', 'skipped')),
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason          TEXT
);

-- Unique constraint for scheduled doses (PRN doses with NULL schedule_id are exempt)
CREATE UNIQUE INDEX dose_logs_unique_slot ON dose_logs (schedule_id, scheduled_date, time_label);

CREATE INDEX idx_dose_logs_user_date ON dose_logs (user_id, scheduled_date);
CREATE INDEX idx_dose_logs_prn ON dose_logs (user_id, medication_id, logged_at) WHERE (schedule_id IS NULL);

ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own dose logs"
  ON dose_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. symptoms
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS symptoms (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id   UUID        REFERENCES medications(id) ON DELETE SET NULL,
  name            TEXT        NOT NULL,
  severity        TEXT        NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  notes           TEXT,
  logged_at       TIMESTAMPTZ,
  logged_date     DATE        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_symptoms_user_date ON symptoms (user_id, logged_date);
CREATE INDEX idx_symptoms_user_medication ON symptoms (user_id, medication_id) WHERE (medication_id IS NOT NULL);

ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own symptoms"
  ON symptoms FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. inventory (legacy — currently unused, 0 rows)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id),
  medication_id   UUID        NOT NULL REFERENCES medications(id),
  remaining_pills INTEGER     NOT NULL,
  total_pills     INTEGER     NOT NULL,
  refill_date     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory."
  ON inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory."
  ON inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory."
  ON inventory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory."
  ON inventory FOR DELETE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. adherence_logs (legacy — currently unused, 0 rows)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS adherence_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id),
  medication_id   UUID        NOT NULL REFERENCES medications(id),
  date            DATE        NOT NULL,
  status          TEXT        NOT NULL CHECK (status IN ('taken', 'skipped', 'snoozed', 'pending')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE adherence_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own adherence logs."
  ON adherence_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own adherence logs."
  ON adherence_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own adherence logs."
  ON adherence_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own adherence logs."
  ON adherence_logs FOR DELETE
  USING (auth.uid() = user_id);
