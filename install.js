#!/usr/bin/env node

/**
 * ARUS Marine Predictive Maintenance - Node.js Installer
 * Cross-platform automated installation script with Docker support
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
  magenta: '\x1b[35m',
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

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

// Check if Docker is available
function checkDocker() {
  const result = exec('docker --version', true);
  if (!result.success) {
    return false;
  }
  
  // Check if Docker daemon is running
  const psResult = exec('docker ps', true);
  if (!psResult.success) {
    log('⚠️  Docker is installed but not running', 'yellow');
    return false;
  }
  
  log(`✅ Docker ${result.output.trim()} found`, 'green');
  return true;
}

// Check if Docker Compose is available
function checkDockerCompose() {
  let result = exec('docker compose version', true);
  if (!result.success) {
    result = exec('docker-compose --version', true);
  }
  return result.success;
}

// Start PostgreSQL with Docker
async function startDockerPostgres() {
  log('\n🐳 Starting PostgreSQL with Docker...', 'cyan');
  
  // Check if docker-compose.yml exists
  if (!fs.existsSync('docker-compose.yml')) {
    log('❌ docker-compose.yml not found', 'red');
    return false;
  }
  
  // Stop any existing postgres container
  exec('docker compose down postgres 2>/dev/null', true);
  
  // Start only the postgres service
  log('Starting PostgreSQL container...', 'cyan');
  const result = exec('docker compose up -d postgres');
  
  if (!result.success) {
    log('❌ Failed to start PostgreSQL container', 'red');
    return false;
  }
  
  log('⏳ Waiting for PostgreSQL to be ready...', 'yellow');
  
  // Wait for PostgreSQL to be healthy (max 30 seconds)
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    const healthCheck = exec('docker compose ps postgres --format json', true);
    
    if (healthCheck.success && healthCheck.output.includes('"Health":"healthy"')) {
      log('✅ PostgreSQL is ready!', 'green');
      return true;
    }
    
    process.stdout.write('.');
  }
  
  log('\n⚠️  PostgreSQL startup timeout', 'yellow');
  log('Run: docker compose logs postgres', 'yellow');
  return false;
}

// Get Docker PostgreSQL connection string
function getDockerConnectionString() {
  // Default values from docker-compose.yml
  return 'postgresql://arus_user:arus_secure_password@localhost:5432/arus';
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
function createEnvFile(databaseUrl = null) {
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    log('✅ .env file already exists', 'green');
    
    // Update DATABASE_URL if provided
    if (databaseUrl) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL=${databaseUrl}`);
        fs.writeFileSync(envPath, envContent, 'utf8');
        log('✅ Updated DATABASE_URL in .env', 'green');
      }
    }
    
    return false;
  }
  
  log('\n📝 Creating .env file...', 'cyan');
  
  const dbUrl = databaseUrl || 'postgresql://user:password@localhost:5432/arus_db';
  
  const envContent = `# Database Configuration
DATABASE_URL=${dbUrl}
PGHOST=localhost
PGPORT=5432
PGUSER=arus_user
PGPASSWORD=arus_secure_password
PGDATABASE=arus

# API Keys
OPENAI_API_KEY=your_openai_api_key_here

# Security
SESSION_SECRET=${generateSecret()}
ADMIN_TOKEN=${generateSecret()}

# Environment
NODE_ENV=development
PORT=5000
`;

  fs.writeFileSync(envPath, envContent, 'utf8');
  log('✅ .env file created with secure secrets', 'green');
  
  if (!databaseUrl) {
    log('⚠️  YOU MUST UPDATE DATABASE_URL IN .env', 'yellow');
  }
  
  return true;
}

// Show database setup instructions
function showDatabaseInstructions() {
  log('\n📊 Database Setup Options', 'cyan');
  log('='.repeat(50), 'cyan');
  log('');
  
  log('🐳 Option 1: Docker (Automatic - Recommended if Docker installed)', 'magenta');
  log('   • Fully automated setup');
  log('   • No manual configuration needed');
  log('   • Starts PostgreSQL in a container\n');
  
  log('☁️  Option 2: Cloud Database (Easy - No installation)', 'blue');
  log('   • Neon: https://neon.tech (free tier)');
  log('   • Supabase: https://supabase.com (free tier)');
  log('   • Just copy the connection string\n');
  
  log('💻 Option 3: Local Installation (Advanced)', 'blue');
  log('   • macOS: brew install postgresql');
  log('   • Ubuntu: sudo apt install postgresql');
  log('   • Windows: https://www.postgresql.org\n');
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
function showSecurityTips(showSecrets = false) {
  log('\n🔒 Security Configuration', 'cyan');
  log('='.repeat(50), 'cyan');
  
  if (showSecrets) {
    log('\nYour .env file has been created with secure random secrets.', 'green');
    log('You can regenerate them anytime with these commands:\n', 'yellow');
    
    log('Generate new SESSION_SECRET:', 'blue');
    log(`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, 'green');
    
    log('\nGenerate new ADMIN_TOKEN:', 'blue');
    log(`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, 'green');
  }
  
  log('\n⚠️  Security reminders:', 'yellow');
  log('   • Never commit .env to version control');
  log('   • Change secrets if you suspect they are compromised');
  log('   • Keep your ADMIN_TOKEN secure - it provides full access');
}

// Show completion message
function showCompletion(usedDocker = false) {
  log('\n🎉 Installation Complete!', 'green');
  log('='.repeat(50), 'green');
  
  log('\n📝 What was set up:\n', 'cyan');
  
  if (usedDocker) {
    log('✅ PostgreSQL running in Docker', 'green');
    log('✅ Database connection configured', 'green');
  }
  log('✅ All dependencies installed', 'green');
  log('✅ Environment variables configured', 'green');
  log('✅ Secure secrets generated', 'green');
  
  log('\n🚀 Quick Start:\n', 'cyan');
  
  log('1. Start the development server:', 'blue');
  log('   npm run dev', 'green');
  
  log('\n2. Open your browser to:', 'blue');
  log('   http://localhost:5000', 'green');
  
  if (usedDocker) {
    log('\n🐳 Docker Commands:', 'cyan');
    log('   docker compose up -d postgres   # Start PostgreSQL');
    log('   docker compose down postgres    # Stop PostgreSQL');
    log('   docker compose logs postgres    # View logs');
  }
  
  log('\n📚 Useful Commands:', 'cyan');
  log('   npm run dev              - Start development server');
  log('   npm run db:push          - Update database schema');
  log('   npm run db:push --force  - Force schema update');
  
  log('\n📖 Documentation:', 'cyan');
  log('   INSTALL.md  - Detailed setup instructions');
  log('   replit.md   - System architecture\n');
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
    
    const hasDocker = checkDocker();
    const hasDockerCompose = hasDocker ? checkDockerCompose() : false;
    
    if (hasDocker && hasDockerCompose) {
      log('✅ Docker Compose found', 'green');
    }
    
    // Step 2: Install dependencies
    installDependencies();
    
    // Step 3: Database setup
    let usedDocker = false;
    let databaseUrl = null;
    
    showDatabaseInstructions();
    
    if (hasDocker && hasDockerCompose) {
      const useDocker = await askQuestion('🐳 Use Docker for PostgreSQL? (y/n): ');
      
      if (useDocker === 'y' || useDocker === 'yes') {
        const started = await startDockerPostgres();
        
        if (started) {
          usedDocker = true;
          databaseUrl = getDockerConnectionString();
          log('✅ PostgreSQL ready via Docker!', 'green');
        } else {
          log('⚠️  Docker setup failed, falling back to manual setup', 'yellow');
        }
      }
    }
    
    // Step 4: Create .env file
    const envCreated = createEnvFile(databaseUrl);
    
    // Step 5: Ask about database schema setup
    if (usedDocker || (!usedDocker && envCreated === false)) {
      const hasDb = await askQuestion('\nHave you configured your database connection? (y/n): ');
      
      if (hasDb === 'y' || hasDb === 'yes' || usedDocker) {
        await setupDatabase();
      } else {
        log('\nPlease update DATABASE_URL in .env, then run:', 'yellow');
        log('npm run db:push', 'green');
      }
    }
    
    // Step 6: Show security tips
    showSecurityTips(envCreated);
    
    // Step 7: Show completion message
    showCompletion(usedDocker);
    
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
