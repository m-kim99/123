-- Add preferences JSONB column to users table
-- Stores user settings like theme and language
-- Run this in Supabase SQL Editor

ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Example value: {"theme": "dark", "language": "ko"}
COMMENT ON COLUMN users.preferences IS 'User preferences (theme, language, etc.)';
