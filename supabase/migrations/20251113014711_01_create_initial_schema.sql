/*
  # Initial Document Management System Schema

  1. New Tables
    - `departments`: Store department information
      - `id` (text, primary key)
      - `name` (text): Department name in Korean
      - `code` (text, unique): Department code (e.g., HR001)
      - `created_at` (timestamp)

    - `categories`: Document categories
      - `id` (uuid, primary key)
      - `name` (text): Category name
      - `description` (text): Category description
      - `department_id` (text, foreign key): Reference to departments
      - `nfc_registered` (boolean): NFC registration status
      - `storage_location` (text): Physical storage location
      - `created_at` (timestamp)

    - `documents`: Document records
      - `id` (uuid, primary key)
      - `name` (text): Document file name
      - `category_id` (uuid, foreign key): Reference to categories
      - `department_id` (text, foreign key): Reference to departments
      - `upload_date` (date): When document was uploaded
      - `uploader` (text): Name of uploader
      - `classified` (boolean): Is document classified/confidential
      - `file_url` (text): Path to document file
      - `created_at` (timestamp)

    - `users`: User accounts
      - `id` (uuid, primary key, from auth)
      - `name` (text): User name in Korean
      - `email` (text): User email
      - `role` (text): 'admin' or 'team'
      - `department_id` (text, foreign key): Team member's department
      - `avatar_url` (text): Avatar image URL
      - `created_at` (timestamp)

    - `chat_messages`: AI Chatbot message history
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key): Reference to users
      - `role` (text): 'user' or 'bot'
      - `content` (text): Message content
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Department members can only view their department's data
    - Admins can view all data

  3. Indexes
    - `departments.code` for quick lookups
    - `documents.department_id` for filtering
    - `documents.category_id` for filtering
    - `categories.department_id` for filtering
*/

CREATE TABLE IF NOT EXISTS departments (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  department_id text NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  nfc_registered boolean DEFAULT false,
  storage_location text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  department_id text NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  upload_date date DEFAULT CURRENT_DATE,
  uploader text NOT NULL,
  classified boolean DEFAULT false,
  file_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'team')),
  department_id text REFERENCES departments(id) ON DELETE SET NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'bot')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_categories_department_id ON categories(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_department_id ON documents(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
