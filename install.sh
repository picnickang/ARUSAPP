#!/bin/bash

# ARUS Marine Predictive Maintenance - Automated Installer with Docker Support
# This script automates the installation and setup process

set -e  # Exit on any error

echo "🚢 ARUS Marine Predictive Maintenance System"
echo "=============================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found${NC}"
    echo ""
    echo -e "${CYAN}Node.js 18+ is required to run this application.${NC}"
    echo ""
    
    # Auto-install prompt
    read -p "Would you like to automatically download and install Node.js LTS? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${CYAN}========================================${NC}"
        echo -e "${CYAN}Installing Node.js LTS...${NC}"
        echo -e "${CYAN}========================================${NC}"
        echo ""
        
        # Check OS type
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            echo -e "${BLUE}Detected: macOS${NC}"
            echo ""
            
            # Check if Homebrew is installed
            if command -v brew &> /dev/null; then
                echo -e "${GREEN}✅ Homebrew detected${NC}"
                echo "Installing Node.js via Homebrew..."
                echo ""
                
                brew install node@20
                
                if [ $? -eq 0 ]; then
                    echo ""
                    echo -e "${GREEN}✅ Node.js installed successfully via Homebrew!${NC}"
                    echo ""
                    echo -e "${YELLOW}Please run this script again to continue installation:${NC}"
                    echo -e "${GREEN}   ./install.sh${NC}"
                    echo ""
                    exit 0
                else
                    echo -e "${RED}❌ Homebrew installation failed${NC}"
                fi
            else
                echo -e "${YELLOW}Homebrew not found. Downloading Node.js installer...${NC}"
                echo ""
                
                # Download Node.js .pkg for macOS
                curl -o nodejs-installer.pkg https://nodejs.org/dist/v20.11.0/node-v20.11.0.pkg
                
                if [ -f nodejs-installer.pkg ]; then
                    echo -e "${GREEN}✅ Download complete${NC}"
                    echo ""
                    echo -e "${CYAN}Installing Node.js...${NC}"
                    echo "The installer will open. Please follow the installation wizard."
                    echo ""
                    
                    # Run the installer
                    sudo installer -pkg nodejs-installer.pkg -target /
                    
                    # Clean up
                    rm nodejs-installer.pkg
                    
                    echo ""
                    echo -e "${GREEN}========================================${NC}"
                    echo -e "${GREEN}Node.js Installation Complete!${NC}"
                    echo -e "${GREEN}========================================${NC}"
                    echo ""
                    echo -e "${YELLOW}Please run this script again to continue installation:${NC}"
                    echo -e "${GREEN}   ./install.sh${NC}"
                    echo ""
                    exit 0
                else
                    echo -e "${RED}❌ Download failed${NC}"
                fi
            fi
            
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            echo -e "${BLUE}Detected: Linux${NC}"
            echo "Installing Node.js via NodeSource repository..."
            echo ""
            
            # Ubuntu/Debian
            if command -v apt-get &> /dev/null; then
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                sudo apt-get install -y nodejs
                
                if [ $? -eq 0 ]; then
                    echo ""
                    echo -e "${GREEN}✅ Node.js installed successfully!${NC}"
                    echo ""
                    echo -e "${YELLOW}Please run this script again to continue installation:${NC}"
                    echo -e "${GREEN}   ./install.sh${NC}"
                    echo ""
                    exit 0
                fi
            else
                echo -e "${RED}❌ Unsupported Linux distribution${NC}"
            fi
        fi
        
        # If auto-install failed, show manual instructions
        echo ""
        echo -e "${RED}❌ Automatic installation failed${NC}"
        echo ""
        echo -e "${CYAN}Please manually install Node.js 18+ (LTS recommended):${NC}"
        echo ""
        echo -e "${BLUE}Installation options:${NC}"
        echo "  • Download: https://nodejs.org (get the LTS version)"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "  • macOS Homebrew: brew install node@20"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            echo "  • Ubuntu/Debian: https://github.com/nodesource/distributions#installation-instructions"
        fi
        echo ""
        echo "After installation, restart your terminal and run this script again."
        exit 1
    else
        # User declined auto-install
        echo ""
        echo -e "${CYAN}Please manually install Node.js 18+ (LTS recommended):${NC}"
        echo ""
        echo -e "${BLUE}Installation options:${NC}"
        echo "  • Download: https://nodejs.org (get the LTS version)"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "  • macOS Homebrew: brew install node@20"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            echo "  • Ubuntu/Debian: https://github.com/nodesource/distributions#installation-instructions"
            echo "    Example: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
            echo "             sudo apt-get install -y nodejs"
        fi
        echo ""
        echo "After installation, restart your terminal and run this script again."
        exit 1
    fi
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18 or higher required${NC}"
    echo -e "${YELLOW}Current version: $(node -v)${NC}"
    echo ""
    echo -e "${CYAN}Please upgrade to Node.js 18+ (LTS recommended):${NC}"
    echo "  • Download: https://nodejs.org (get the LTS version)"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  • macOS Homebrew: brew install node@20"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "  • Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        echo "                   sudo apt-get install -y nodejs"
    fi
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) found${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v) found${NC}"

# Check if Docker is installed and running
HAS_DOCKER=false
if command -v docker &> /dev/null; then
    if docker ps &> /dev/null; then
        echo -e "${GREEN}✅ Docker $(docker --version | cut -d' ' -f3 | tr -d ',') found${NC}"
        HAS_DOCKER=true
        
        # Check for docker compose
        if docker compose version &> /dev/null || command -v docker-compose &> /dev/null; then
            echo -e "${GREEN}✅ Docker Compose found${NC}"
        else
            HAS_DOCKER=false
        fi
    else
        echo -e "${YELLOW}⚠️  Docker is installed but not running${NC}"
    fi
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed successfully${NC}"

# Function to generate random secret
generate_secret() {
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

# Show database setup options
echo ""
echo -e "${CYAN}📊 Database Setup Options${NC}"
echo -e "${CYAN}==================================================${NC}"
echo ""

if [ "$HAS_DOCKER" = true ]; then
    echo -e "${MAGENTA}🐳 Option 1: Docker (Automatic - Recommended)${NC}"
    echo "   • Fully automated setup"
    echo "   • No manual configuration needed"
    echo "   • Starts PostgreSQL in a container"
    echo ""
fi

echo -e "${BLUE}☁️  Option 2: Cloud Database (Easy - Recommended for beginners)${NC}"
echo "   • Neon: https://neon.tech (free tier, no credit card)"
echo "   • Supabase: https://supabase.com (free tier)"
echo "   • No installation needed - just copy the connection string"
echo ""

echo -e "${BLUE}💻 Option 3: Local PostgreSQL Installation${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "   • macOS: brew install postgresql@15"
    echo "           brew services start postgresql@15"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "   • Ubuntu/Debian: sudo apt update"
    echo "                    sudo apt install postgresql postgresql-contrib"
    echo "                    sudo systemctl start postgresql"
else
    echo "   • Download from: https://www.postgresql.org/download/"
fi
echo ""

# Docker PostgreSQL setup
USE_DOCKER=false
DATABASE_URL=""

if [ "$HAS_DOCKER" = true ]; then
    read -p "🐳 Use Docker for PostgreSQL? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${CYAN}🐳 Starting PostgreSQL with Docker...${NC}"
        
        # Stop any existing postgres container
        docker compose down postgres 2>/dev/null || true
        
        # Start only the postgres service
        echo "Starting PostgreSQL container..."
        docker compose up -d postgres
        
        if [ $? -eq 0 ]; then
            echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
            
            # Wait for PostgreSQL to be healthy (max 30 seconds)
            for i in {1..30}; do
                sleep 1
                if docker compose ps postgres --format json 2>/dev/null | grep -q '"Health":"healthy"'; then
                    echo ""
                    echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
                    USE_DOCKER=true
                    DATABASE_URL="postgresql://arus_user:arus_secure_password@localhost:5432/arus"
                    break
                fi
                echo -n "."
            done
            
            if [ "$USE_DOCKER" = false ]; then
                echo ""
                echo -e "${YELLOW}⚠️  PostgreSQL startup timeout${NC}"
                echo "Run: docker compose logs postgres"
            fi
        else
            echo -e "${RED}❌ Failed to start PostgreSQL container${NC}"
        fi
    fi
fi

# Create or update .env file
echo ""
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    
    SESSION_SECRET=$(generate_secret)
    ADMIN_TOKEN=$(generate_secret)
    
    if [ -n "$DATABASE_URL" ]; then
        DB_URL=$DATABASE_URL
    else
        DB_URL="postgresql://user:password@localhost:5432/arus_db"
    fi
    
    cat > .env << EOF
# Database Configuration
DATABASE_URL=$DB_URL
PGHOST=localhost
PGPORT=5432
PGUSER=arus_user
PGPASSWORD=arus_secure_password
PGDATABASE=arus

# API Keys
OPENAI_API_KEY=your_openai_api_key_here

# Security
SESSION_SECRET=$SESSION_SECRET
ADMIN_TOKEN=$ADMIN_TOKEN

# Environment
NODE_ENV=development
PORT=5000
EOF
    
    echo -e "${GREEN}✅ .env file created with secure secrets${NC}"
    
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${YELLOW}⚠️  YOU MUST UPDATE DATABASE_URL IN .env${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
    
    # Update DATABASE_URL if using Docker
    if [ -n "$DATABASE_URL" ]; then
        if grep -q "DATABASE_URL=" .env; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env
            else
                # Linux
                sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env
            fi
            echo -e "${GREEN}✅ Updated DATABASE_URL in .env${NC}"
        fi
    fi
fi

# Ask about database schema setup
echo ""
if [ "$USE_DOCKER" = true ]; then
    read -p "Do you want to set up the database schema now? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🗄️  Setting up database schema..."
        npm run db:push
        
        if [ $? -ne 0 ]; then
            echo -e "${YELLOW}⚠️  Database push failed - you may need to run: npm run db:push --force${NC}"
        else
            echo -e "${GREEN}✅ Database schema created successfully${NC}"
        fi
    fi
else
    read -p "Have you configured your database connection? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
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
    else
        echo -e "${YELLOW}Please update DATABASE_URL in .env, then run: npm run db:push${NC}"
    fi
fi

# Security reminders
echo ""
echo -e "${CYAN}🔒 Security Configuration${NC}"
echo -e "${CYAN}==================================================${NC}"
echo ""
echo -e "${GREEN}Your .env file has been created with secure random secrets.${NC}"
echo ""
echo -e "${YELLOW}⚠️  Security reminders:${NC}"
echo "   • Never commit .env to version control"
echo "   • Change secrets if you suspect they are compromised"
echo "   • Keep your ADMIN_TOKEN secure - it provides full access"

# Installation complete
echo ""
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "${CYAN}📝 What was set up:${NC}"
echo ""
if [ "$USE_DOCKER" = true ]; then
    echo -e "${GREEN}✅ PostgreSQL running in Docker${NC}"
    echo -e "${GREEN}✅ Database connection configured${NC}"
fi
echo -e "${GREEN}✅ All dependencies installed${NC}"
echo -e "${GREEN}✅ Environment variables configured${NC}"
echo -e "${GREEN}✅ Secure secrets generated${NC}"
echo ""
echo -e "${CYAN}🚀 Quick Start:${NC}"
echo ""
echo -e "${BLUE}1. Start the development server:${NC}"
echo -e "${GREEN}   npm run dev${NC}"
echo ""
echo -e "${BLUE}2. Open your browser to:${NC}"
echo -e "${GREEN}   http://localhost:5000${NC}"
echo ""

if [ "$USE_DOCKER" = true ]; then
    echo -e "${CYAN}🐳 Docker Commands:${NC}"
    echo "   docker compose up -d postgres   # Start PostgreSQL"
    echo "   docker compose down postgres    # Stop PostgreSQL"
    echo "   docker compose logs postgres    # View logs"
    echo ""
fi

echo -e "${CYAN}📚 Useful Commands:${NC}"
echo "   npm run dev              - Start development server"
echo "   npm run db:push          - Update database schema"
echo "   npm run db:push --force  - Force schema update"
echo ""
echo -e "${CYAN}📖 Documentation:${NC}"
echo "   INSTALL.md  - Detailed setup instructions"
echo "   replit.md   - System architecture"
echo ""
