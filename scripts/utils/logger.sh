#!/bin/bash

##############################################################################
# Logging Utilities for Shell Scripts
# 
# Provides consistent logging functions across all shell scripts.
# Automatically sources colors.sh for colored output.
#
# Usage:
#   source "$(dirname "$0")/utils/logger.sh"
#   log_info "Starting process..."
#   log_success "Process completed!"
##############################################################################

# Source color definitions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/colors.sh"

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

# Log informational message
log_info() {
    echo -e "${INFO}[INFO]${NC} $1"
}

# Log success message
log_success() {
    echo -e "${SUCCESS}[SUCCESS]${NC} $1"
}

# Log warning message
log_warning() {
    echo -e "${WARNING}[WARNING]${NC} $1"
}

# Log error message
log_error() {
    echo -e "${ERROR}[ERROR]${NC} $1"
}

# Log debug message (only if DEBUG=true)
log_debug() {
    if [[ "${DEBUG}" == "true" ]]; then
        echo -e "${DEBUG}[DEBUG]${NC} $1"
    fi
}

# Log step/section header
log_step() {
    echo -e "\n${CYAN}===${NC} $1 ${CYAN}===${NC}\n"
}

# Log subsection
log_subsection() {
    echo -e "${BLUE}---${NC} $1 ${BLUE}---${NC}"
}

# ============================================================================
# PROGRESS INDICATORS
# ============================================================================

# Show spinner while running a command
# Usage: run_with_spinner "Message" command args...
run_with_spinner() {
    local message="$1"
    shift
    local cmd="$@"
    
    # Start spinner in background
    (
        spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
        i=0
        while kill -0 $$ 2>/dev/null; do
            i=$(( (i+1) %10 ))
            printf "\r${BLUE}${spin:$i:1}${NC} $message"
            sleep 0.1
        done
    ) &
    spinner_pid=$!
    
    # Run the actual command
    $cmd > /dev/null 2>&1
    local exit_code=$?
    
    # Stop spinner
    kill $spinner_pid 2>/dev/null
    wait $spinner_pid 2>/dev/null
    
    # Clear spinner line
    printf "\r\033[K"
    
    # Show result
    if [ $exit_code -eq 0 ]; then
        log_success "$message"
    else
        log_error "$message (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Show progress bar
# Usage: show_progress 75 "Downloading..."
show_progress() {
    local percent=$1
    local message=$2
    local width=50
    local filled=$(( percent * width / 100 ))
    local empty=$(( width - filled ))
    
    printf "\r${CYAN}["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "]${NC} ${percent}%% ${message}"
}

# ============================================================================
# FORMATTING HELPERS
# ============================================================================

# Print a separator line
print_separator() {
    echo -e "${CYAN}$(printf '%.0s─' {1..80})${NC}"
}

# Print a header box
print_header() {
    local text="$1"
    local width=80
    local padding=$(( (width - ${#text} - 2) / 2 ))
    
    echo -e "${CYAN}╔$(printf '%.0s═' $(seq 1 $((width-2))))╗${NC}"
    printf "${CYAN}║${NC}%${padding}s${BOLD}${WHITE}%s${NC}%${padding}s${CYAN}║${NC}\n" "" "$text" ""
    echo -e "${CYAN}╚$(printf '%.0s═' $(seq 1 $((width-2))))╝${NC}"
}

# Print a table row
print_table_row() {
    local col1="$1"
    local col2="$2"
    printf "  ${BOLD}%-30s${NC} %s\n" "$col1:" "$col2"
}

# ============================================================================
# INTERACTIVE PROMPTS
# ============================================================================

# Ask yes/no question
# Usage: if ask_yes_no "Continue?"; then ...
ask_yes_no() {
    local question="$1"
    local default="${2:-y}" # Default to yes
    
    if [[ "$default" == "y" ]]; then
        local prompt="[Y/n]"
    else
        local prompt="[y/N]"
    fi
    
    while true; do
        echo -ne "${YELLOW}${question} ${prompt}${NC} "
        read -r response
        
        # Use default if empty
        if [[ -z "$response" ]]; then
            response="$default"
        fi
        
        case "${response,,}" in
            y|yes) return 0 ;;
            n|no) return 1 ;;
            *) echo -e "${ERROR}Please answer yes or no.${NC}" ;;
        esac
    done
}

# Confirm dangerous operation
confirm_danger() {
    local message="$1"
    echo -e "${BG_RED}${WHITE}${BOLD} WARNING ${NC} ${RED}$message${NC}"
    ask_yes_no "Are you absolutely sure you want to continue?" "n"
}

# ============================================================================
# ERROR HANDLING
# ============================================================================

# Exit with error message
die() {
    log_error "$1"
    exit "${2:-1}"
}

# Check command exit code and exit on failure
check_exit_code() {
    local exit_code=$?
    local message="${1:-Command failed}"
    
    if [ $exit_code -ne 0 ]; then
        die "$message (exit code: $exit_code)" $exit_code
    fi
}

# Require command to exist
require_command() {
    local cmd="$1"
    local package="${2:-$1}"
    
    if ! command -v "$cmd" &> /dev/null; then
        die "$cmd is not installed. Please install $package first."
    fi
}

# ============================================================================
# TIMING HELPERS
# ============================================================================

# Start a timer
start_timer() {
    export TIMER_START=$(date +%s)
}

# End timer and show elapsed time
end_timer() {
    local message="${1:-Completed}"
    if [[ -n "$TIMER_START" ]]; then
        local end=$(date +%s)
        local elapsed=$((end - TIMER_START))
        local minutes=$((elapsed / 60))
        local seconds=$((elapsed % 60))
        
        if [ $minutes -gt 0 ]; then
            log_success "$message in ${minutes}m ${seconds}s"
        else
            log_success "$message in ${seconds}s"
        fi
        
        unset TIMER_START
    else
        log_success "$message"
    fi
}

# ============================================================================
# FILE OPERATIONS WITH LOGGING
# ============================================================================

# Safe file copy with logging
safe_copy() {
    local src="$1"
    local dest="$2"
    
    if [[ ! -f "$src" ]]; then
        log_error "Source file not found: $src"
        return 1
    fi
    
    cp "$src" "$dest" && log_info "Copied: $src → $dest"
}

# Safe file move with logging
safe_move() {
    local src="$1"
    local dest="$2"
    
    if [[ ! -f "$src" ]]; then
        log_error "Source file not found: $src"
        return 1
    fi
    
    mv "$src" "$dest" && log_info "Moved: $src → $dest"
}

# Safe file delete with confirmation
safe_delete() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        log_warning "File not found: $file"
        return 0
    fi
    
    if ask_yes_no "Delete $file?"; then
        rm "$file" && log_info "Deleted: $file"
    fi
}
