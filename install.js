#!/usr/bin/env node

/**
 * ARUS Marine Predictive Maintenance - Node.js Installer
 * Cross-platform automated installation script
 * 
 * Usage: node install.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper function for colored output
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper function to execute shell commands
function exec(command, silent = false) {
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error };
  }
}

// Helper function to ask user questions
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

// Check Node.js version
function checkNodeVersion() {
  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    log(`❌ Node.js 18 or higher required`, 'red');
    log(`Current version: ${version}`, 'yellow');
    log('Please upgrade Node.js from https://nodejs.org', 'yellow');
    process.exit(1);
  }
  
  log(`✅ Node.js ${version} found`, 'green');
}

// Check if npm is available
function checkNpm() {
  const result = exec('npm -v', true);
  if (!result.success) {
    log('❌ npm not found', 'red');
    process.exit(1);
  }
  log(`✅ npm ${result.output.trim()} found`, 'green');
}

// Install dependencies
function installDependencies() {
  log('\n📦 Installing dependencies...', 'cyan');
  log('This may take a few minutes...', 'yellow');
  
  const result = exec('npm install');
  
  if (!result.success) {
    log('❌ Failed to install dependencies', 'red');
    log('Try running: npm cache clean --force', 'yellow');
    process.exit(1);
  }
  
  log('✅ Dependencies installed successfully', 'green');
}

// Create .env file
function createEnvFile() {
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    log('✅ .env file already exists', 'green');
    return false;
  }
  
  log('\n📝 Creating .env file...', 'cyan');
  
  const envContent = `# Database Configuration
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
`;

  fs.writeFileSync(envPath, envContent, 'utf8');
  log('✅ .env file created', 'green');
  log('⚠️  YOU MUST EDIT THE .env FILE WITH YOUR CREDENTIALS', 'yellow');
  
  return true;
}

// Show database setup instructions
function showDatabaseInstructions() {
  log('\n📊 Database Setup', 'cyan');
  log('='.repeat(50), 'cyan');
  log('\nYou have two options:\n', 'yellow');
  
  log('1️⃣  Use a cloud database (Recommended):', 'blue');
  log('   • Neon: https://neon.tech (free tier available)');
  log('   • Supabase: https://supabase.com (free tier available)');
  log('   • Heroku Postgres: https://www.heroku.com\n');
  
  log('2️⃣  Install PostgreSQL locally:', 'blue');
  log('   • macOS: brew install postgresql');
  log('   • Ubuntu: sudo apt install postgresql');
  log('   • Windows: Download from https://www.postgresql.org\n');
}

// Setup database schema
async function setupDatabase() {
  const answer = await askQuestion('Do you want to set up the database schema now? (y/n): ');
  
  if (answer !== 'y' && answer !== 'yes') {
    log('\nSkipping database setup.', 'yellow');
    log('Run "npm run db:push" when ready to set up the database.', 'yellow');
    return;
  }
  
  log('\n🗄️  Setting up database schema...', 'cyan');
  
  const result = exec('npm run db:push');
  
  if (!result.success) {
    log('⚠️  Database push failed', 'yellow');
    log('You may need to run: npm run db:push --force', 'yellow');
    log('Make sure your DATABASE_URL in .env is correct.', 'yellow');
  } else {
    log('✅ Database schema created successfully', 'green');
  }
}

// Generate secure random strings
function generateSecret() {
  return require('crypto').randomBytes(32).toString('hex');
}

// Show security tips
function showSecurityTips() {
  log('\n🔒 Security Configuration', 'cyan');
  log('='.repeat(50), 'cyan');
  
  log('\nGenerate secure secrets for your .env file:\n', 'yellow');
  
  log('SESSION_SECRET:', 'blue');
  log(generateSecret(), 'green');
  
  log('\nADMIN_TOKEN:', 'blue');
  log(generateSecret(), 'green');
  
  log('\n⚠️  Copy these values into your .env file', 'yellow');
  log('⚠️  Never commit .env to version control', 'yellow');
}

// Show completion message
function showCompletion() {
  log('\n🎉 Installation Complete!', 'green');
  log('='.repeat(50), 'green');
  
  log('\n📝 Next Steps:\n', 'cyan');
  
  log('1. Edit your .env file with proper credentials:', 'blue');
  log('   • Update DATABASE_URL with your PostgreSQL connection string');
  log('   • Add your OPENAI_API_KEY (optional, for AI features)');
  log('   • Set secure SESSION_SECRET and ADMIN_TOKEN (see above)');
  
  log('\n2. Start the development server:', 'blue');
  log('   npm run dev', 'green');
  
  log('\n3. Open your browser to:', 'blue');
  log('   http://localhost:5000', 'green');
  
  log('\n📚 Useful Commands:', 'cyan');
  log('   npm run dev         - Start development server');
  log('   npm run db:push     - Update database schema');
  log('   npm run db:push --force - Force database schema update');
  
  log('\n📖 Documentation:', 'cyan');
  log('   See INSTALL.md for detailed setup instructions');
  log('   See replit.md for system architecture\n');
}

// Main installation function
async function main() {
  console.clear();
  
  log('🚢 ARUS Marine Predictive Maintenance System', 'cyan');
  log('='.repeat(50), 'cyan');
  log('Automated Installation Script\n', 'cyan');
  
  try {
    // Step 1: Check prerequisites
    log('📋 Checking prerequisites...', 'cyan');
    checkNodeVersion();
    checkNpm();
    
    // Step 2: Install dependencies
    installDependencies();
    
    // Step 3: Create .env file
    const envCreated = createEnvFile();
    
    // Step 4: Show database instructions
    showDatabaseInstructions();
    
    // Step 5: Ask about database setup
    const hasDb = await askQuestion('Have you set up a PostgreSQL database? (y/n): ');
    
    if (hasDb === 'y' || hasDb === 'yes') {
      await setupDatabase();
    } else {
      log('\nPlease set up a PostgreSQL database and update the .env file', 'yellow');
      log('Then run: npm run db:push', 'yellow');
    }
    
    // Step 6: Show security tips
    if (envCreated) {
      showSecurityTips();
    }
    
    // Step 7: Show completion message
    showCompletion();
    
  } catch (error) {
    log('\n❌ Installation failed', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Run the installer
if (require.main === module) {
  main().catch((error) => {
    log('\n❌ Unexpected error', 'red');
    log(error.message, 'red');
    process.exit(1);
  });
}

module.exports = { main };
