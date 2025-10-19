@echo off
REM Build ARUS Desktop Application for Windows
REM Creates .exe installer for Windows

echo ========================================
echo ARUS Windows Desktop Application Builder
echo ========================================
echo.

REM Check if build exists
if not exist "dist" (
    echo Building application first...
    call npm run build
)

REM Create build directory
echo Setting up build environment...
if exist "windows-build-temp" rmdir /s /q windows-build-temp
mkdir windows-build-temp

REM Copy necessary files
xcopy /E /I /Q dist windows-build-temp\dist
xcopy /E /I /Q electron windows-build-temp\electron
copy electron-builder.yml windows-build-temp\

REM Create proper package.json for electron-builder
(
echo {
echo   "name": "arus-marine-monitoring",
echo   "productName": "ARUS Marine Monitoring",
echo   "version": "1.0.0",
echo   "description": "Marine Predictive Maintenance and Scheduling System",
echo   "main": "electron/main.js",
echo   "author": "ARUS Team",
echo   "license": "MIT",
echo   "devDependencies": {
echo     "electron": "^33.0.0",
echo     "electron-builder": "^26.0.0"
echo   }
echo }
) > windows-build-temp\package.json

REM Build installer
cd windows-build-temp
echo.
echo Installing dependencies...
call npm install --silent

echo.
echo Building Windows installer (this may take a few minutes)...
echo.

REM Build for Windows
call npx electron-builder --win

cd ..

REM Move built files to dist directory
if not exist "dist\installers" mkdir dist\installers
if exist "windows-build-temp\dist" (
    xcopy /E /I /Q windows-build-temp\dist\*.exe dist\installers\
)

REM Cleanup
rmdir /s /q windows-build-temp

echo.
echo ========================================
echo Windows Desktop Application Built!
echo ========================================
echo.
echo Installers created in: dist\installers\
dir /B dist\installers\*.exe 2>nul || echo No EXE files found
echo.
echo You should have:
echo   - ARUS-Setup-1.0.0.exe  (Installer version)
echo   - ARUS-1.0.0.exe        (Portable version)
echo.
echo To install:
echo   1. Run ARUS-Setup-1.0.0.exe
echo   2. Follow the installation wizard
echo   3. Launch from Start Menu
echo.
echo For portable (no installation):
echo   - Just run ARUS-1.0.0.exe directly
echo.
pause
