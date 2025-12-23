/*
  # Add company_id/description to departments

  This aligns the DB schema with the application logic that filters departments by company.
*/

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE departments
  DROP CONSTRAINT IF EXISTS departments_code_key;

CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_company_id_code_unique
  ON departments(company_id, code);
