/*
  # Row Level Security Policies

  1. Departments Table
    - Public SELECT: All authenticated users can view departments
    - Admin only: INSERT, UPDATE, DELETE

  2. Categories Table
    - Admins: Full access to all categories
    - Team members: Can view categories in their department

  3. Documents Table
    - Admins: Full access to all documents
    - Team members: Can view/download documents in their department
    - Uploaders: Can manage their own documents

  4. Users Table
    - Users: Can view their own profile
    - Admins: Can view all user profiles

  5. Chat Messages Table
    - Users: Can view and create their own messages
*/

-- Departments: All authenticated users can view
CREATE POLICY "Departments are viewable by authenticated users"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update departments"
  ON departments FOR UPDATE
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

CREATE POLICY "Only admins can delete departments"
  ON departments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Categories: Admin full access, team members view own department
CREATE POLICY "Admins can view all categories"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Team members can view their department categories"
  ON categories FOR SELECT
  TO authenticated
  USING (
    department_id = (
      SELECT department_id FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Only admins can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update categories"
  ON categories FOR UPDATE
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

CREATE POLICY "Only admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Documents: Admin full access, team members view own department
CREATE POLICY "Admins can view all documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Team members can view their department documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    department_id = (
      SELECT department_id FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Only admins can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Team members can insert documents in their department"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    department_id = (
      SELECT department_id FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Only admins can update documents"
  ON documents FOR UPDATE
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

CREATE POLICY "Team members can update their own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    uploader = (
      SELECT name FROM users
      WHERE users.id = auth.uid()
    )
  )
  WITH CHECK (
    uploader = (
      SELECT name FROM users
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Only admins can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Team members can delete their own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    uploader = (
      SELECT name FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Users: View own profile or all profiles if admin
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all user profiles"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Chat Messages: Users view their own, admins view all
CREATE POLICY "Users can view their own chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can create chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
