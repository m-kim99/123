# Supabase Setup Guide for Document Management System

## Overview

The Document Management System is now fully integrated with Supabase for data persistence. The system maintains mock data as a fallback, allowing the application to function without authentication while still demonstrating all features.

## Database Schema

### Tables

#### 1. **departments**
Stores organizational department information.

```
- id (text, primary key): Department ID (e.g., 'HR001')
- name (text): Department name in Korean
- code (text, unique): Department code
- created_at (timestamptz): Creation timestamp
```

Mock data:
- 인사팀 (HR001)
- 개발팀 (DEV001)
- 마케팅팀 (MKT001)
- 회계팀 (FIN001)

#### 2. **categories**
Document categories for organization within departments.

```
- id (uuid, primary key): Auto-generated UUID
- name (text): Category name
- description (text): Category description
- department_id (text, foreign key): Reference to departments
- nfc_registered (boolean): NFC registration status
- storage_location (text): Physical storage location
- created_at (timestamptz): Creation timestamp
```

Mock data: 6 categories across all departments

#### 3. **documents**
Individual document records.

```
- id (uuid, primary key): Auto-generated UUID
- name (text): Document filename
- category_id (uuid, foreign key): Reference to categories
- department_id (text, foreign key): Reference to departments
- upload_date (date): Upload date
- uploader (text): Name of person who uploaded
- classified (boolean): Confidential document flag
- file_url (text): Path to document file
- created_at (timestamptz): Creation timestamp
```

Mock data: 8 sample documents

#### 4. **users**
User accounts and profiles.

```
- id (uuid, primary key): Reference to auth.users
- name (text): User name in Korean
- email (text): User email
- role (text): 'admin' or 'team'
- department_id (text, foreign key): Team member's department
- avatar_url (text): Avatar image URL
- created_at (timestamptz): Creation timestamp
```

#### 5. **chat_messages**
AI Chatbot message history.

```
- id (uuid, primary key): Auto-generated UUID
- user_id (uuid, foreign key): Reference to auth.users
- role (text): 'user' or 'bot'
- content (text): Message content
- created_at (timestamptz): Creation timestamp
```

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

### Departments
- **SELECT**: All authenticated users can view
- **INSERT/UPDATE/DELETE**: Admins only

### Categories
- **SELECT (Admin)**: Admins see all categories
- **SELECT (Team)**: Team members see only their department's categories
- **INSERT/UPDATE/DELETE**: Admins only

### Documents
- **SELECT (Admin)**: Admins see all documents
- **SELECT (Team)**: Team members see only their department's documents
- **INSERT (Admin)**: Admins can insert any document
- **INSERT (Team)**: Team members can insert to their own department
- **UPDATE**: Admins can update all; uploaders can update their own
- **DELETE**: Admins can delete all; uploaders can delete their own

### Users
- **SELECT**: Users view own profile; admins view all profiles
- **UPDATE**: Users update their own profile

### Chat Messages
- **SELECT**: Users view their own; admins view all
- **INSERT**: Authenticated users create messages

## Indexes

The following indexes are created for performance:
- `departments.code` - Quick department lookups
- `categories.department_id` - Filter categories by department
- `documents.department_id` - Filter documents by department
- `documents.category_id` - Filter documents by category
- `users.department_id` - Filter users by department
- `users.role` - Filter users by role
- `chat_messages.user_id` - Filter messages by user
- `chat_messages.created_at` - Sort messages by timestamp

## Environment Variables

Required environment variables in `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

These are automatically configured in the Supabase dashboard.

## Client Setup

The Supabase client is configured in `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Data Fetching in Stores

The document store (`src/store/documentStore.ts`) provides async methods:

```typescript
// Fetch all departments from Supabase
await useDocumentStore.getState().fetchDepartments();

// Fetch all categories
await useDocumentStore.getState().fetchCategories();

// Fetch all documents
await useDocumentStore.getState().fetchDocuments();

// Add new category
await useDocumentStore.getState().addCategory({
  name: '새 카테고리',
  description: '설명',
  departmentId: 'HR001',
  nfcRegistered: true,
  storageLocation: '위치'
});

// Delete document
await useDocumentStore.getState().deleteDocument(documentId);
```

## Current Implementation

### Mock Data as Fallback
The store maintains mock data as initial state, allowing the application to:
- Function without authentication
- Display immediately without loading delays
- Provide fallback data if Supabase is unavailable

### Real-time Sync
When users perform operations (add, delete, update), the changes are:
1. Sent to Supabase
2. Store state is updated
3. UI reflects changes immediately

## Next Steps for Production

### 1. Implement Authentication
```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
```

### 2. File Storage Integration
Configure Supabase Storage for document file uploads:
```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .upload(`${departmentId}/${fileName}`, file);
```

### 3. Real-time Subscriptions
Enable real-time updates across users:
```typescript
supabase
  .channel('documents')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'documents' },
    (payload) => {
      // Update UI with new data
    }
  )
  .subscribe();
```

### 4. Edge Functions
Deploy Supabase Edge Functions for:
- Document processing
- Email notifications
- Advanced AI chatbot responses
- Document analysis

## Testing

### Test RLS Policies
```bash
# Test as admin
# - Should access all documents

# Test as team member
# - Should only access own department documents

# Test as unauthenticated user
# - Should not access any data
```

### Test Data Operations
```bash
# Add category
# Verify it appears in UI
# Verify in Supabase console

# Delete document
# Verify it's removed from store
# Verify in Supabase console

# Update category
# Verify changes are reflected
```

## Troubleshooting

### "Missing Supabase environment variables"
Ensure `.env` file contains:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

### "Unauthorized" errors
- Check RLS policies are correctly configured
- Verify user has correct role in database
- Ensure authentication token is valid

### Slow performance
- Check indexes are created
- Verify RLS policy complexity
- Use `explain plan` to analyze slow queries

## Security Considerations

1. **Never commit `.env` file** with real credentials
2. **Use RLS** for all sensitive tables
3. **Validate input** on both client and server
4. **Enable HTTPS** for all connections
5. **Rotate API keys** regularly
6. **Monitor access logs** for suspicious activity
7. **Use service role key** only on backend (never client-side)

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
