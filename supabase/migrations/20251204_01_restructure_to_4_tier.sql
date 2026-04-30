/*
  # Restructure to 4-tier taxonomy (Department > Parent Category > Subcategory > Document)

  Changes:
  1. Treat existing `categories` as parent categories
     - Move NFC/보관 위치 정보를 세부 카테고리(subcategories)로 이관
  2. Create `subcategories` table
     - References parent `categories` and `departments`
     - Holds NFC and storage metadata
  3. Update `documents` table
     - Replace `category_id` with `subcategory_id`
     - Add `parent_category_id` for query optimization
  4. Add supporting indexes
*/

-- 1) Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  nfc_uid text,
  nfc_registered boolean NOT NULL DEFAULT false,
  storage_location text,
  created_at timestamptz DEFAULT now()
);

-- 2) Backfill subcategories from existing categories
--    Create one default subcategory per category if none exists yet
INSERT INTO subcategories (
  name,
  description,
  parent_category_id,
  department_id,
  nfc_registered,
  storage_location,
  created_at
)
SELECT
  c.name,
  c.description,
  c.id AS parent_category_id,
  c.department_id,
  COALESCE(c.nfc_registered, false) AS nfc_registered,
  c.storage_location,
  c.created_at
FROM categories c
LEFT JOIN subcategories s
  ON s.parent_category_id = c.id
WHERE s.id IS NULL;

-- 3) Add new columns to documents (nullable for now)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS parent_category_id uuid;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS subcategory_id uuid;

-- 4) Add foreign keys for new columns
ALTER TABLE documents
  ADD CONSTRAINT documents_parent_category_id_fkey
    FOREIGN KEY (parent_category_id)
    REFERENCES categories(id)
    ON DELETE CASCADE;

ALTER TABLE documents
  ADD CONSTRAINT documents_subcategory_id_fkey
    FOREIGN KEY (subcategory_id)
    REFERENCES subcategories(id)
    ON DELETE CASCADE;

-- 5) Backfill parent_category_id + subcategory_id from existing category_id
UPDATE documents d
SET
  parent_category_id = c.id,
  subcategory_id = s.id
FROM categories c
JOIN subcategories s
  ON s.parent_category_id = c.id
WHERE d.category_id = c.id
  AND d.parent_category_id IS NULL
  AND d.subcategory_id IS NULL;

-- 6) Enforce NOT NULL on new columns
ALTER TABLE documents
  ALTER COLUMN parent_category_id SET NOT NULL;

ALTER TABLE documents
  ALTER COLUMN subcategory_id SET NOT NULL;

-- 7) Drop old foreign key, index, and column for category_id
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_category_id_fkey;

DROP INDEX IF EXISTS idx_documents_category_id;

ALTER TABLE documents
  DROP COLUMN IF EXISTS category_id;

-- 8) Categories: drop columns that conceptually moved to subcategories
ALTER TABLE categories
  DROP COLUMN IF EXISTS nfc_registered,
  DROP COLUMN IF EXISTS storage_location;

-- 9) Add indexes for subcategories and documents
CREATE INDEX IF NOT EXISTS idx_subcategories_parent_category_id
  ON subcategories(parent_category_id);

CREATE INDEX IF NOT EXISTS idx_subcategories_department_id
  ON subcategories(department_id);

CREATE INDEX IF NOT EXISTS idx_subcategories_nfc_uid
  ON subcategories(nfc_uid);

CREATE INDEX IF NOT EXISTS idx_documents_subcategory_id
  ON documents(subcategory_id);

CREATE INDEX IF NOT EXISTS idx_documents_parent_category_id
  ON documents(parent_category_id);
