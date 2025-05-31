# Lost & Found Portal Setup Guide

## 🚀 Quick Start with Supabase

### Step 1: Create Supabase Project

1. **Go to [Supabase](https://supabase.com)** and create an account
2. **Create a new project**:
   - Project name: `UMT Lost & Found Portal`
   - Database password: Choose a strong password
   - Region: Choose closest to your location

3. **Get your project credentials**:
   - Go to Settings → API
   - Copy the Project URL and anon public key
   - Copy the service_role secret key (for backend)

### Step 2: Set Up Database Schema

1. **Open SQL Editor** in your Supabase dashboard
2. **Run the schema file**:
   - Copy the entire content from `backend/supabase_schema.sql`
   - Paste it in the SQL Editor
   - Click "Run" to create all tables and policies

### Step 3: Configure Environment Variables

1. **Create backend/.env file**:
```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Settings
ENVIRONMENT=development
SECRET_KEY=your-very-secure-secret-key-change-this
```

### Step 4: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 5: Install Frontend Dependencies

```bash
cd frontend
npm install
# or
yarn install
```

### Step 6: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
python server.py
# Backend will run on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# Frontend will run on http://localhost:3000
```

## 🔧 Configuration Details

### Supabase Settings

#### Authentication
- **Email confirmations**: Disable for development
- **Enable email confirmations**: Set to `false` in Auth settings
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/**`

#### Storage
- The schema automatically creates an `item-images` bucket
- Images are publicly accessible
- Users can only upload to their own folders

#### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only see/modify their own data
- Public items are visible to everyone
- Admins have elevated permissions

### API Endpoints

The backend provides these key endpoints:

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

#### Items
- `GET /api/items` - List items with filtering/search
- `GET /api/items/{id}` - Get single item
- `POST /api/items` - Create new item
- `PUT /api/items/{id}` - Update item

#### File Upload
- `POST /api/upload` - Upload images

#### Dashboard
- `GET /api/dashboard` - Get user dashboard data

#### Claims
- `POST /api/claims` - Create claim request

## 🔍 Testing the Setup

### 1. Test Database Connection
```bash
cd backend
python -c "from database import get_supabase; print('✅ Supabase connected:', get_supabase().table('profiles').select('*').execute())"
```

### 2. Test API Endpoints
```bash
# Health check
curl http://localhost:8000/api/health

# Get items (should return empty array initially)
curl http://localhost:8000/api/items
```

### 3. Test Frontend Registration
1. Go to `http://localhost:3000`
2. Click "Register" 
3. Use a `@umt.edu` email address
4. Complete registration flow

## 📱 Frontend Integration

The frontend is already set up but needs to be connected to the real API. Key changes needed:

### Update API Base URL
In `frontend/src/App.js` or create a config file:
```javascript
const API_BASE_URL = 'http://localhost:8000/api';
```

### Replace Mock Data
Remove the `MOCK_ITEMS` array and connect to real API endpoints.

## 🔐 Security Features

### University Email Validation
- Only `@umt.edu` emails can register
- Email verification can be enabled in Supabase

### Row Level Security
- Users can only access their own items and claims
- Public items visible to all
- Admin role for moderation

### File Upload Security
- Only authenticated users can upload
- Files stored in user-specific folders
- Image validation on backend

## 🚀 Production Deployment

### Backend (Railway/Heroku/DigitalOcean)
1. Set environment variables in deployment platform
2. Update CORS origins to include production domain
3. Use production Supabase project

### Frontend (Vercel/Netlify)
1. Build: `npm run build`
2. Update API URL to production backend
3. Set environment variables for Supabase keys

### Database
- Supabase handles scaling automatically
- Enable email confirmations for production
- Set up custom SMTP for branded emails

## 🎯 Next Steps - Complete Implementation

### Critical (Do This Now)
1. ✅ Set up Supabase project with provided schema
2. ✅ Configure environment variables  
3. ✅ Test backend API endpoints
4. 🔄 Connect frontend to real API (replace mock data)
5. 🔄 Test complete user registration → post item → claim flow

### Important (Do Soon)
1. Add real-time notifications using Supabase subscriptions
2. Implement image upload in frontend forms
3. Add admin dashboard for content moderation
4. Set up email templates in Supabase

### Nice to Have (Future)
1. Real-time chat between users
2. Image similarity AI for matching items
3. Push notifications
4. Mobile app using React Native

## 🆘 Troubleshooting

### Common Issues

#### "Module not found" errors
```bash
pip install -r requirements.txt --force-reinstall
```

#### Supabase connection issues
- Check if environment variables are set correctly
- Verify Supabase project URL and keys
- Ensure database schema was applied

#### CORS errors
- Check `allowed_origins` in `config.py`
- Verify frontend is running on expected port

#### Authentication failures
- Check JWT token format
- Verify Supabase auth settings
- Enable anonymous access for public endpoints

## 📞 Support

If you encounter issues:
1. Check Supabase dashboard logs
2. Check backend logs in terminal
3. Verify database schema was applied correctly
4. Test API endpoints individually with curl/Postman

---

**🎉 You're ready to go! Your Lost & Found Portal should now be fully functional with Supabase backend!** 