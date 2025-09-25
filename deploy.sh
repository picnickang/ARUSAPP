#!/bin/bash

# ARUS (Marine Predictive Maintenance & Scheduling) Deployment Script
# This script handles the deployment of the ARUS system using Docker Compose

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
ARUS Deployment Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    deploy      Deploy the ARUS system
    start       Start the ARUS system
    stop        Stop the ARUS system
    restart     Restart the ARUS system
    logs        Show logs from all services
    status      Show status of all services
    backup      Backup the database
    restore     Restore the database from backup
    clean       Clean up unused Docker resources
    help        Show this help message

Options:
    -p, --production    Use production profile
    -m, --monitoring    Include monitoring services (Prometheus/Grafana)
    -d, --domain        Set domain name (for SSL)
    -h, --help          Show this help message

Examples:
    $0 deploy                           # Basic deployment
    $0 deploy --production             # Production deployment
    $0 deploy --monitoring             # Include monitoring
    $0 --domain example.com deploy     # Deploy with custom domain
    $0 logs                            # View logs
    $0 backup                          # Backup database

EOF
}

# Default values
PRODUCTION=false
MONITORING=false
DOMAIN=""
COMPOSE_FILE="docker-compose.yml"
PROFILES=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--production)
            PRODUCTION=true
            shift
            ;;
        -m|--monitoring)
            MONITORING=true
            PROFILES="--profile monitoring"
            shift
            ;;
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        deploy|start|stop|restart|logs|status|backup|clean|help)
            COMMAND=$1
            shift
            ;;
        restore)
            COMMAND=$1
            BACKUP_FILE=$2
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate command
if [[ -z "$COMMAND" ]]; then
    log_error "No command specified"
    show_help
    exit 1
fi

# Docker Compose command detection
DOCKER_COMPOSE_CMD=""

detect_docker_compose() {
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    log_info "Using Docker Compose command: $DOCKER_COMPOSE_CMD"
}

# Detect Docker Compose command for all operations
detect_docker_compose

# Pre-flight checks
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Docker Compose already detected globally
    
    # Check if .env file exists
    if [[ ! -f ".env" ]]; then
        log_warning ".env file not found. Creating from template..."
        if [[ -f ".env.example" ]]; then
            cp .env.example .env
            log_info "Please edit .env file with your configuration before continuing."
            exit 1
        else
            log_error ".env.example file not found. Cannot create .env file."
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Set environment variables
set_environment() {
    if [[ -n "$DOMAIN" ]]; then
        export DOMAIN="$DOMAIN"
        log_info "Using domain: $DOMAIN"
    fi
    
    if [[ "$PRODUCTION" == true ]]; then
        export NODE_ENV=production
        log_info "Using production environment"
    fi
}

# Execute commands
case $COMMAND in
    deploy)
        log_info "Deploying ARUS system..."
        check_prerequisites
        set_environment
        
        # Create necessary directories
        mkdir -p data monitoring/grafana/provisioning scripts
        
        # Pull latest images
        log_info "Pulling latest Docker images..."
        $DOCKER_COMPOSE_CMD $PROFILES pull
        
        # Build and start services
        log_info "Building and starting services..."
        $DOCKER_COMPOSE_CMD $PROFILES up -d --build
        
        # Wait for services to be healthy
        log_info "Waiting for services to start..."
        sleep 10
        
        # Check service health
        $DOCKER_COMPOSE_CMD $PROFILES ps
        
        log_success "ARUS system deployed successfully!"
        log_info "Access the application at: http://localhost (or your configured domain)"
        
        if [[ "$MONITORING" == true ]]; then
            log_info "Monitoring available at:"
            log_info "  - Prometheus: http://localhost:9090"
            log_info "  - Grafana: http://localhost:3000"
        fi
        ;;
        
    start)
        log_info "Starting ARUS system..."
        set_environment
        $DOCKER_COMPOSE_CMD $PROFILES up -d
        log_success "ARUS system started"
        ;;
        
    stop)
        log_info "Stopping ARUS system..."
        $DOCKER_COMPOSE_CMD $PROFILES down
        log_success "ARUS system stopped"
        ;;
        
    restart)
        log_info "Restarting ARUS system..."
        set_environment
        $DOCKER_COMPOSE_CMD $PROFILES restart
        log_success "ARUS system restarted"
        ;;
        
    logs)
        log_info "Showing logs..."
        $DOCKER_COMPOSE_CMD $PROFILES logs -f
        ;;
        
    status)
        log_info "Service status:"
        $DOCKER_COMPOSE_CMD $PROFILES ps
        echo
        log_info "Container health:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        ;;
        
    backup)
        log_info "Creating database backup..."
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        $DOCKER_COMPOSE_CMD exec postgres pg_dump -U arus_user arus > "$BACKUP_FILE"
        log_success "Database backup created: $BACKUP_FILE"
        ;;
        
    restore)
        if [[ -z "$BACKUP_FILE" ]]; then
            log_error "Please specify backup file: $0 restore <backup_file>"
            exit 1
        fi
        log_info "Restoring database from $BACKUP_FILE..."
        $DOCKER_COMPOSE_CMD exec -T postgres psql -U arus_user arus < "$BACKUP_FILE"
        log_success "Database restored from $BACKUP_FILE"
        ;;
        
    clean)
        log_info "Cleaning up Docker resources..."
        docker system prune -f
        docker volume prune -f
        log_success "Docker cleanup completed"
        ;;
        
    help)
        show_help
        ;;
        
    *)
        log_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac