/*
  # RLS Policies for 4-tier taxonomy

  This migration enables Row Level Security for the new `subcategories` table
  and adds admin/team access control similar to `categories`.
*/

-- Enable RLS on subcategories
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- Admins can view all subcategories
CREATE POLICY "Admins can view all subcategories"
  ON subcategories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Team members can view subcategories in their department
CREATE POLICY "Team members can view their department subcategories"
  ON subcategories FOR SELECT
  TO authenticated
  USING (
    department_id = (
      SELECT department_id FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Only admins can insert subcategories
CREATE POLICY "Only admins can insert subcategories"
  ON subcategories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can update subcategories
CREATE POLICY "Only admins can update subcategories"
  ON subcategories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can delete subcategories
CREATE POLICY "Only admins can delete subcategories"
  ON subcategories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
