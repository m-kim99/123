/*
  # Add companies table and users.company_id column

  1. New Tables
    - `companies`: Store company information
      - `id` (uuid, primary key)
      - `name` (text): Company name
      - `code` (text, unique): Company code for identification
      - `created_at` (timestamp)

  2. Changes
    - Add `company_id` column to `users` table
    - Add foreign key constraint from users.company_id to companies.id
*/

-- 1) Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 2) Add company_id column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

-- 3) Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(code);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- 4) Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 5) RLS policies for companies
CREATE POLICY "Anyone can read companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );
