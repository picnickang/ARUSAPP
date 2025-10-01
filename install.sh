#!/bin/bash

# ARUS Marine Predictive Maintenance - Automated Installer
# This script automates the installation and setup process

set -e  # Exit on any error

echo "🚢 ARUS Marine Predictive Maintenance System"
echo "=============================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18 or higher required${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) found${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v) found${NC}"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed successfully${NC}"

# Check if .env file exists
echo ""
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/arus_db
PGHOST=localhost
PGPORT=5432
PGUSER=your_user
PGPASSWORD=your_password
PGDATABASE=arus_db

# API Keys
OPENAI_API_KEY=your_openai_api_key_here

# Security
SESSION_SECRET=change_this_to_a_random_secret_string
ADMIN_TOKEN=change_this_to_a_secure_admin_token

# Environment
NODE_ENV=development
PORT=5000
EOF
    echo -e "${YELLOW}⚠️  .env file created - YOU MUST EDIT IT${NC}"
    echo "Please edit .env and add your:"
    echo "  - Database connection details"
    echo "  - OpenAI API key (if using AI features)"
    echo "  - Session secret and admin token"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Database setup instructions
echo ""
echo "📊 Database Setup"
echo "=================="
echo ""
echo "You have two options:"
echo ""
echo "1️⃣  Use a cloud database (Recommended):"
echo "   - Neon: https://neon.tech (free tier available)"
echo "   - Supabase: https://supabase.com (free tier available)"
echo "   - Heroku Postgres: https://www.heroku.com"
echo ""
echo "2️⃣  Install PostgreSQL locally:"
echo "   - macOS: brew install postgresql"
echo "   - Ubuntu: sudo apt install postgresql"
echo "   - Windows: Download from https://www.postgresql.org"
echo ""
read -p "Have you set up a PostgreSQL database? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Please set up a PostgreSQL database and update the .env file${NC}"
    echo "Then run: npm run db:push"
    exit 0
fi

# Ask if they want to push database schema
echo ""
read -p "Do you want to set up the database schema now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗄️  Setting up database schema..."
    npm run db:push
    
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️  Database push failed - you may need to run: npm run db:push --force${NC}"
    else
        echo -e "${GREEN}✅ Database schema created successfully${NC}"
    fi
fi

# Build instructions
echo ""
echo "🎉 Installation Complete!"
echo "========================="
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Edit your .env file with proper credentials:"
echo "   nano .env (or use any text editor)"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Open your browser to:"
echo "   http://localhost:5000"
echo ""
echo "📚 Useful Commands:"
echo "   npm run dev         - Start development server"
echo "   npm run db:push     - Update database schema"
echo "   npm run db:push --force - Force database schema update"
echo ""
echo "🔒 Security Notes:"
echo "   - Change SESSION_SECRET in .env to a random string"
echo "   - Change ADMIN_TOKEN to a secure token"
echo "   - Never commit .env file to version control"
echo ""
echo "📖 Documentation: See replit.md for system architecture"
echo ""
