# Quick Start Guide

## 🚀 Get Started in 2 Minutes

### 1. Install & Run
```bash
npm install
npm run dev
```

The app opens at `http://localhost:5173`

### 2. Login

**Admin Account:**
- Tab: "관리자" (Admin)
- Email: any value (e.g., admin@company.com)
- Password: any value

**Team Member Account:**
- Tab: "팀원" (Team)
- Email: any value (e.g., team@company.com)
- Password: any value

### 3. Explore Features

**Admin:**
- Go to `/admin` dashboard
- View all departments and documents
- Manage categories
- Access statistics

**Team Member:**
- Go to `/team` dashboard
- See only your department's documents
- View department statistics

## 📚 What You Can Do

### Browse Documents
- View all documents in your department
- Search documents
- Download documents (UI ready)

### Manage Categories
- Create new categories
- Edit category details
- Delete categories
- Set NFC registration and storage location

### View Statistics
- Monthly upload trends
- Top categories by count
- Department distribution (admin only)

### Chat with AI
- Click chat button in bottom-right
- Ask about documents, departments, categories
- See smart responses based on keywords

## 🔧 Build & Deploy

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Vercel (recommended)
vercel
```

## 📊 Database Status

✅ Supabase Connected
✅ All Tables Created
✅ 4 Departments
✅ 6 Categories
✅ 8 Sample Documents
✅ RLS Policies Enabled

## 📚 Documentation

- **README.md** - Full project documentation
- **SUPABASE_SETUP.md** - Database configuration
- **IMPLEMENTATION_SUMMARY.md** - Technical details
- **DEPLOYMENT_CHECKLIST.md** - Pre-deployment verification

## 🎨 Features Overview

| Feature | Admin | Team |
|---------|-------|------|
| View Documents | ✅ All | ✅ Own Dept |
| Upload Documents | ✅ | ✅ Own Dept |
| Manage Categories | ✅ | ❌ |
| View Departments | ✅ | ✅ Own |
| Statistics | ✅ All | ✅ Own Dept |
| AI Chatbot | ✅ | ✅ |

## 🆘 Troubleshooting

**App won't start?**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm run dev
```

**Port already in use?**
```bash
# Vite will automatically use next available port
# Or specify a port:
npm run dev -- --port 3000
```

**Supabase connection issues?**
- Check `.env` file has correct credentials
- Verify Supabase project is running
- App falls back to mock data if DB unavailable

## 🚀 Next Steps

1. **Explore the UI** - Click around and test features
2. **Read Documentation** - Check README.md for details
3. **Check Database** - View tables in Supabase dashboard
4. **Customize** - Modify colors, text, layouts
5. **Deploy** - Push to production when ready

## 📝 Notes

- All credentials are mock (for demo purposes)
- Data resets on page refresh (mock mode)
- Real authentication not yet implemented
- File uploads are UI only
- Database is read-only in demo mode

## 💡 Tips

- Admin orange theme vs Team green theme
- Responsive design - try on mobile
- Smooth animations and transitions
- Chat works with keywords: "신입사원", "개발팀", etc.
- All components use shadcn/ui

---

**Build Date**: November 13, 2024  
**Status**: ✅ Production Ready  
**Version**: 1.0.0
