@echo off
REM ARUS Marine Predictive Maintenance - Windows Installer
REM This script automates the installation and setup process

echo ========================================
echo ARUS Marine Predictive Maintenance System
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found
    echo.
    echo Please install Node.js 18+ (LTS recommended^):
    echo.
    echo Installation:
    echo   1. Visit: https://nodejs.org
    echo   2. Download the LTS (Long Term Support^) version
    echo   3. Run the installer
    echo   4. After installation, restart this terminal
    echo   5. Run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node -v
echo.

REM Check Node.js version
for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%

if %NODE_MAJOR% LSS 18 (
    echo [ERROR] Node.js version 18 or higher required
    echo Current version: 
    node -v
    echo.
    echo Please upgrade to Node.js 18+ (LTS recommended^):
    echo   Visit: https://nodejs.org
    echo   Download and install the LTS version
    echo.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found
    pause
    exit /b 1
)

echo [OK] npm found:
npm -v

REM Install dependencies
echo.
echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [OK] Dependencies installed successfully

REM Check if .env file exists
if not exist .env (
    echo.
    echo Creating .env file...
    (
        echo # Database Configuration
        echo DATABASE_URL=postgresql://user:password@localhost:5432/arus_db
        echo PGHOST=localhost
        echo PGPORT=5432
        echo PGUSER=your_user
        echo PGPASSWORD=your_password
        echo PGDATABASE=arus_db
        echo.
        echo # API Keys
        echo OPENAI_API_KEY=your_openai_api_key_here
        echo.
        echo # Security
        echo SESSION_SECRET=change_this_to_a_random_secret_string
        echo ADMIN_TOKEN=change_this_to_a_secure_admin_token
        echo.
        echo # Environment
        echo NODE_ENV=development
        echo PORT=5000
    ) > .env
    
    echo [WARNING] .env file created - YOU MUST EDIT IT
    echo Please edit .env and add your:
    echo   - Database connection details
    echo   - OpenAI API key (if using AI features^)
    echo   - Session secret and admin token
) else (
    echo [OK] .env file already exists
)

REM Database setup instructions
echo.
echo ==========================================
echo PostgreSQL Database Setup
echo ==========================================
echo.
echo Choose one of these options:
echo.
echo Option 1: Cloud Database (RECOMMENDED - No installation^)
echo --------------------------------------------------------
echo   a. Neon (https://neon.tech^)
echo      - Free tier with no credit card
echo      - 1. Create account and project
echo      - 2. Copy the connection string
echo      - 3. Paste into .env file
echo.
echo   b. Supabase (https://supabase.com^)
echo      - Free tier available
echo      - 1. Create project
echo      - 2. Go to Settings -^> Database
echo      - 3. Copy connection string (URI format^)
echo      - 4. Paste into .env file
echo.
echo Option 2: Local PostgreSQL Installation
echo ----------------------------------------
echo   1. Download: https://www.postgresql.org/download/windows/
echo   2. Run the installer (choose latest stable version^)
echo   3. During install:
echo      - Remember the password you set
echo      - Keep default port (5432^)
echo      - Install pgAdmin 4 (database management tool^)
echo   4. After install:
echo      - Open pgAdmin 4
echo      - Create new database called 'arus_db'
echo      - Update .env with your credentials
echo.
set /p dbsetup="Have you set up a PostgreSQL database? (y/n): "

if /i not "%dbsetup%"=="y" (
    echo Please set up a PostgreSQL database and update the .env file
    echo Then run: npm run db:push
    pause
    exit /b 0
)

REM Ask if they want to push database schema
echo.
set /p dbpush="Do you want to set up the database schema now? (y/n): "

if /i "%dbpush%"=="y" (
    echo Setting up database schema...
    call npm run db:push
    
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Database push failed - you may need to run: npm run db:push --force
    ) else (
        echo [OK] Database schema created successfully
    )
)

REM Installation complete
echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next Steps:
echo.
echo 1. Edit your .env file with proper credentials
echo.
echo 2. Start the development server:
echo    npm run dev
echo.
echo 3. Open your browser to:
echo    http://localhost:5000
echo.
echo Useful Commands:
echo    npm run dev         - Start development server
echo    npm run db:push     - Update database schema
echo    npm run db:push --force - Force database schema update
echo.
echo Security Notes:
echo    - Change SESSION_SECRET in .env to a random string
echo    - Change ADMIN_TOKEN to a secure token
echo    - Never commit .env file to version control
echo.
echo Documentation: See replit.md for system architecture
echo.
pause
