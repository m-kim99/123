# 문서 관리 시스템 (Document Management System)

A comprehensive document management system built with React, TypeScript, and Vite.

## Features

### Authentication
- **Admin Login**: Full system access with orange theme
- **Team Member Login**: Department-specific access with green theme
- Mock authentication (any email/password works)

### Admin Features
- Dashboard with system-wide statistics
- Department management
- Full document and category management
- Access to all departments and documents
- System-wide statistics and analytics

### Team Member Features
- Department-specific dashboard
- View documents within their department
- Upload documents to their department
- Department-level statistics

### Core Functionality
- **Document Management**: Upload, view, download, and delete documents
- **Category Management**: Create categories with NFC registration and storage location
- **Department Organization**: 4 departments (HR, Development, Marketing, Finance)
- **Search Functionality**: Quick search across documents
- **Statistics Dashboard**: Monthly uploads, category distribution, department stats
- **AI Chatbot Widget**:
  - Floating button in bottom-right corner with smooth animations
  - Smart responses based on user queries (시스템 정보, 부서, 카테고리 등)
  - Real-time message display with timestamps
  - Theme-aware styling (orange for admin, green for team)
  - User and bot message differentiation
- **Responsive Design**: Mobile-friendly interface

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Routing**: React Router v6
- **State Management**: Zustand
- **Icons**: Lucide React

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Login Credentials

**Admin Login:**
- Any email (e.g., admin@company.com)
- Any password
- Select "관리자" tab

**Team Member Login:**
- Any email (e.g., team@company.com)
- Any password
- Select "팀원" tab
- Default department: HR (인사팀)

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── DashboardLayout.tsx
│   ├── AIChatbot.tsx    # AI Chatbot component
│   └── ui/             # shadcn/ui components
├── pages/              # Page components
│   ├── LoginPage.tsx
│   ├── AdminDashboard.tsx
│   ├── TeamDashboard.tsx
│   ├── DocumentManagement.tsx
│   ├── CategoryDetail.tsx
│   ├── DepartmentManagement.tsx
│   └── Statistics.tsx
├── store/              # Zustand stores
│   ├── authStore.ts
│   └── documentStore.ts
└── App.tsx             # Main app with routing
```

## Routes

### Admin Routes
- `/admin` - Admin dashboard
- `/admin/departments` - Department management
- `/admin/documents` - Document management
- `/admin/statistics` - Statistics
- `/admin/category/:id` - Category details

### Team Member Routes
- `/team` - Team dashboard
- `/team/documents` - Document management
- `/team/statistics` - Statistics
- `/team/category/:id` - Category details

## Mock Data

The system includes mock data for:
- 4 departments (인사팀, 개발팀, 마케팅팀, 회계팀)
- 6 document categories
- 8 sample documents in Korean

## Color Scheme

- **Admin**: Orange (#FF8C42)
- **Team**: Green (#10B981)
- **UI**: Neutral slate colors with shadcn/ui styling

## Features in Detail

### Document Categories
Each category includes:
- Name and description
- Department assignment
- Document count
- NFC registration status
- Physical storage location

### Document Upload
- PDF file restriction
- Category assignment
- Department tracking
- Upload date and user tracking
- Classification (confidential/public)

### AI Chatbot
- Collapsible widget
- Fixed position (bottom-right)
- Simple message interface
- Themed according to user role

### Statistics
- Monthly upload trends
- Top categories by document count
- Department distribution (admin only)
- Growth rate indicators

## Database Integration

This system is fully integrated with **Supabase** for data persistence:

- **Cloud PostgreSQL Database**: All documents, categories, and user data stored in the cloud
- **Row Level Security (RLS)**: Fine-grained access control at the database level
- **Authentication Ready**: Built-in support for Supabase Auth integration
- **Real-time Capable**: Infrastructure ready for real-time subscriptions
- **Mock Data Fallback**: Application works with mock data if Supabase is unavailable

For detailed Supabase setup and configuration, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

### Current Features
- Async data operations (add, update, delete categories and documents)
- Proper error handling with fallback to mock data
- Type-safe database queries with TypeScript
- Security policies enforcing role-based access

### To Activate Supabase Sync
Call the fetch methods in your components:
```typescript
const { fetchDepartments, fetchCategories, fetchDocuments } = useDocumentStore();

useEffect(() => {
  fetchDepartments();
  fetchCategories();
  fetchDocuments();
}, []);
```

## Browser Support

Modern browsers with ES6+ support:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
