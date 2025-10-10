# ARUS Installation Guide

This guide will help you install and set up the ARUS Marine Predictive Maintenance System on your computer.

## 🚀 Quick Install (Recommended)

### For macOS/Linux:
```bash
chmod +x install.sh
./install.sh
```

### For Windows:
```cmd
install.bat
```

The installer will:
- ✅ Check for Node.js
- ✅ Install all dependencies
- ✅ Create a `.env` configuration file
- ✅ Guide you through database setup
- ✅ Initialize the database schema

---

## 📋 Prerequisites

Before installing, make sure you have:

1. **Node.js 18 or higher**
   - Download from: https://nodejs.org
   - Verify: `node -v` (should show v18.0.0 or higher)

2. **PostgreSQL Database**
   - Option A: Cloud database (recommended for beginners)
     - Neon: https://neon.tech (free tier)
     - Supabase: https://supabase.com (free tier)
   - Option B: Local installation
     - macOS: `brew install postgresql`
     - Ubuntu: `sudo apt install postgresql`
     - Windows: https://www.postgresql.org/download/windows/

3. **OpenAI API Key** (optional, only for AI features)
   - Get one at: https://platform.openai.com/api-keys

---

## 📝 Manual Installation

If you prefer to install manually:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/database
PGHOST=your_host
PGPORT=5432
PGUSER=your_user
PGPASSWORD=your_password
PGDATABASE=your_database

# API Keys
OPENAI_API_KEY=your_openai_api_key_here

# Security
SESSION_SECRET=your_random_secret_string_here
ADMIN_TOKEN=your_secure_admin_token_here

# Environment
NODE_ENV=development
PORT=5000
```

### Step 3: Set Up Database
```bash
npm run db:push
```

If you encounter data-loss warnings:
```bash
npm run db:push --force
```

### Step 4: Start the Application
```bash
npm run dev
```

### Step 5: Open in Browser
Navigate to: http://localhost:5000

---

## 🔧 Configuration Details

### Database Setup (Cloud - Recommended)

**Using Neon (Free Tier):**
1. Go to https://neon.tech
2. Sign up for a free account
3. Create a new project
4. Copy the connection string
5. Paste it as `DATABASE_URL` in your `.env` file

**Using Supabase (Free Tier):**
1. Go to https://supabase.com
2. Sign up for a free account
3. Create a new project
4. Go to Settings → Database
5. Copy the connection string (URI format)
6. Paste it as `DATABASE_URL` in your `.env` file

### Database Setup (Local)

**macOS:**
```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL
brew services start postgresql

# Create database
createdb arus_db

# Update .env with local connection
DATABASE_URL=postgresql://localhost:5432/arus_db
```

**Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql

# Create user and database
sudo -u postgres createuser -P arus_user
sudo -u postgres createdb arus_db

# Update .env with connection details
```

**Windows:**
1. Download PostgreSQL installer from https://www.postgresql.org
2. Run the installer and follow the setup wizard
3. Remember the password you set for the postgres user
4. Use pgAdmin to create a new database called `arus_db`
5. Update your `.env` file with the connection details

---

## 🔐 Security Configuration

### Generate Secure Secrets

**For SESSION_SECRET:**
```bash
# Generate a random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**For ADMIN_TOKEN:**
```bash
# Generate a random token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy these values into your `.env` file.

---

## 🧪 Verify Installation

After installation, test that everything works:

1. **Check the application is running:**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"OK",...}`

2. **Check database connection:**
   Navigate to http://localhost:5000 and check if the dashboard loads

3. **Check API endpoints:**
   ```bash
   curl http://localhost:5000/api/vessels
   ```

---

## 📚 Available Commands

```bash
npm run dev          # Start development server with hot reload
npm run db:push      # Update database schema
npm start            # Start production server
```

---

## ❓ Troubleshooting

### "Node.js not found"
- Install Node.js from https://nodejs.org
- Make sure to restart your terminal after installation

### "Database connection failed"
- Check your `DATABASE_URL` in `.env` is correct
- Make sure PostgreSQL is running
- Verify database credentials are correct

### "npm install fails"
- Try clearing npm cache: `npm cache clean --force`
- Delete `node_modules` folder and run `npm install` again

### "Port 5000 already in use"
- Change `PORT=5000` to another port in `.env` (e.g., `PORT=3000`)
- Or stop the process using port 5000

### "ADMIN_TOKEN not configured"
- Make sure your `.env` file has `ADMIN_TOKEN=your_token_here`
- Restart the server after updating `.env`

---

## 🆘 Need Help?

If you encounter issues:

1. Check the logs in the terminal
2. Make sure all prerequisites are installed
3. Verify your `.env` file is properly configured
4. Check that your database is accessible

---

## 📦 What's Included

The ARUS system includes:
- 🚢 Vessel management
- ⚙️ Equipment monitoring
- 📊 Real-time telemetry
- 🔧 Work order management
- 👥 Crew scheduling
- 🤖 AI-powered insights (requires OpenAI API key)
- 📈 Predictive maintenance
- ⚠️ DTC diagnostic system

---

## 📱 Mobile Installation (Progressive Web App)

ARUS is a full-featured Progressive Web App (PWA) that can be installed on smartphones and tablets for offline access and a native app experience.

### iPhone & iPad Installation
📖 **Detailed Guide**: See `IOS_INSTALL.md` for complete instructions

**Quick Steps:**
1. Open Safari and navigate to your ARUS URL
2. Tap the Share button (square with arrow)
3. Select "Add to Home Screen"
4. Tap "Add" to install

**Features:**
- ✅ Full-screen mode (no browser bars)
- ✅ Offline access to cached data
- ✅ Home screen icon like a native app
- ✅ Background data sync
- ✅ Push notifications (optional)

### Android Installation
**Quick Steps:**
1. Open Chrome and navigate to your ARUS URL
2. Tap "Install" when the banner appears
3. Or use Menu → "Install app"

**Features:**
- ✅ Standalone app mode
- ✅ Offline functionality
- ✅ Background sync
- ✅ Push notifications

### Desktop Installation (Chrome/Edge)
1. Visit ARUS URL in Chrome or Edge
2. Click the install icon (⊕) in the address bar
3. Or use Menu → "Install ARUS Marine"

### PWA Capabilities
- **Offline Mode**: Dashboard, equipment health, work orders (cached 24 hours)
- **Real-Time Sync**: Updates automatically when connection restored
- **Maritime Ready**: Perfect for at-sea operations with limited connectivity
- **Cross-Platform**: One app works on iPhone, Android, tablets, and desktop

📋 **Complete PWA Checklist**: See `PWA_CHECKLIST.md` for verification

---

## 🎉 You're Ready!

Once everything is set up, you can:
- Create vessels and equipment
- Import telemetry data
- Generate AI-powered reports
- Manage work orders
- Schedule crew assignments
- **Install on mobile devices** for offline access

Enjoy using ARUS! 🚢
