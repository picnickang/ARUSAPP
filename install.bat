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
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node -v

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
echo ==================
echo Database Setup
echo ==================
echo.
echo You have two options:
echo.
echo 1. Use a cloud database (Recommended^):
echo    - Neon: https://neon.tech (free tier available^)
echo    - Supabase: https://supabase.com (free tier available^)
echo    - Heroku Postgres: https://www.heroku.com
echo.
echo 2. Install PostgreSQL locally:
echo    - Download from https://www.postgresql.org
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
