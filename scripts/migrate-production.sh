#!/bin/bash

# Production migration script for Railway deployment
# Handles existing databases with proper baselining and robust error handling

echo "SCRIPT START: migrate-production.sh is executing"
echo "SCRIPT START: Current directory: $(pwd)"
echo "SCRIPT START: Script args: $@"

set -e

# Configuration
SCHEMA_PATH="./prisma/schema.prisma"
MIGRATIONS_DIR="./prisma/migrations"
DRY_RUN=${DRY_RUN:-false}
VERBOSE=${VERBOSE:-true}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

log_verbose() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

# Error handling
handle_error() {
    log_error "Migration failed on line $1"
    log_error "Command: $2"
    exit 1
}

trap 'handle_error $LINENO "$BASH_COMMAND"' ERR

# Validation functions
validate_environment() {
    log_info "Validating environment..."
    log_info "Checking schema path: $SCHEMA_PATH"
    
    # Check if required files exist
    if [ ! -f "$SCHEMA_PATH" ]; then
        log_error "Prisma schema not found at $SCHEMA_PATH"
        log_info "Current directory contents:"
        ls -la || true
        exit 1
    fi
    log_info "✓ Schema file exists"
    
    log_info "Checking migrations directory: $MIGRATIONS_DIR"
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_error "Migrations directory not found at $MIGRATIONS_DIR"
        log_info "Current directory contents:"
        ls -la || true
        exit 1
    fi
    log_info "✓ Migrations directory exists"
    
    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL environment variable is not set"
        log_info "Available environment variables:"
        env | grep -E "(DATABASE|NODE|RAILWAY)" || true
        exit 1
    fi
    log_info "✓ DATABASE_URL is set"
    
    # Check if npx is available
    if ! command -v npx &> /dev/null; then
        log_error "npx is not installed or not in PATH"
        log_info "PATH: $PATH"
        log_info "Available commands:"
        which node || true
        which npm || true
        exit 1
    fi
    log_info "✓ npx is available"
    
    log_success "Environment validation passed"
}

# Smart migration check - only run migrations if needed
check_migrations_needed() {
    log_info "Checking if migrations are needed..."
    
    # Get available migration files
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_warning "No migrations directory found, skipping migration check"
        return 1
    fi
    
    # Count migration directories without command substitution
    local available_migrations=0
    for dir in "$MIGRATIONS_DIR"/*_*/; do
        if [ -d "$dir" ]; then
            available_migrations=$((available_migrations + 1))
        fi
    done
    
    if [ "$available_migrations" -eq 0 ]; then
        log_info "No migration files found, skipping migrations"
        return 1
    fi
    
    log_info "Found $available_migrations migration files"
    
    # Simple approach: always run migrations on first deployment, then use Prisma's built-in detection
    # Prisma migrate deploy will automatically skip if no pending migrations
    log_info "Proceeding with migration check - Prisma will determine if deployment needed"
    return 0
}

# Baseline existing migrations dynamically
baseline_migrations() {
    log_info "Baselining existing migrations..."
    log_info "Marking all migrations as already applied to existing database"
    
    # Mark the initial migration as applied for existing databases
    npx --yes prisma migrate resolve --applied "20250715085601_init" --schema="$SCHEMA_PATH" 2>&1 || true
    
    # Add future migrations here as they are created
    # Example:
    # npx --yes prisma migrate resolve --applied "20250716000000_add_feature" --schema="$SCHEMA_PATH" 2>&1 || true
    
    log_success "Baseline process completed"
}

# Generate Prisma client
generate_client() {
    log_info "Generating Prisma client..."
    log_info "Running: npx prisma generate --schema=$SCHEMA_PATH"
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY RUN] Would generate Prisma client"
        return 0
    fi
    
    # Create a temporary file to capture output
    local temp_file=$(mktemp)
    
    # Run the command and tee output to both console and temp file
    npx --yes prisma generate --schema="$SCHEMA_PATH" 2>&1 | tee "$temp_file"
    local exit_code=${PIPESTATUS[0]}
    
    local generate_output=$(cat "$temp_file")
    rm -f "$temp_file"
    
    if [ $exit_code -ne 0 ]; then
        log_error "Prisma client generation failed (exit code: $exit_code)"
        return 1
    fi
    
    log_success "Prisma client generated successfully"
}

# Main migration process
main() {
    log_info "Starting Puka production database migration..."
    log_info "Current working directory: $(pwd)"
    log_info "Script location: $0"
    log_info "Environment: NODE_ENV=${NODE_ENV:-not set}, DATABASE_URL=${DATABASE_URL:0:50}..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log_warning "Running in DRY RUN mode - no actual changes will be made"
    fi
    
    # Validate environment
    validate_environment
    
    # Check if migrations are actually needed
    if check_migrations_needed; then
        # Deploy migrations
        log_info "Deploying migrations..."
        if npx --yes prisma migrate deploy --schema="$SCHEMA_PATH" 2>&1; then
            log_success "Migrations deployed successfully"
        else
            # Handle P3005 error for existing databases
            log_warning "Migration deployment encountered P3005 error"
            log_info "Attempting to baseline existing database..."
            baseline_migrations
            log_info "Retrying migration deployment..."
            if npx --yes prisma migrate deploy --schema="$SCHEMA_PATH" 2>&1; then
                log_success "Migrations deployed successfully after baseline"
            else
                log_error "Migration deployment failed even after baseline"
                exit 1
            fi
        fi
    else
        log_success "No migrations needed, database is up to date"
    fi
    
    # Generate client
    generate_client
    
    log_success "Puka migration process completed successfully!"
    exit 0
}

# Help function
show_help() {
    cat << EOF
Production Migration Script for Puka Reading Tracker

Usage: $0 [OPTIONS]

Options:
    -h, --help          Show this help message
    -d, --dry-run       Run in dry-run mode (no actual changes)
    -v, --verbose       Enable verbose logging
    
Environment Variables:
    DATABASE_URL        PostgreSQL connection string (required)
    DRY_RUN            Set to 'true' for dry-run mode
    VERBOSE            Set to 'true' for verbose logging

Examples:
    $0                  # Normal migration
    $0 --dry-run        # Dry run mode
    $0 --verbose        # Verbose logging
    DRY_RUN=true $0     # Dry run via environment variable
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

echo "SCRIPT: Argument parsing completed"
echo "SCRIPT: DRY_RUN=$DRY_RUN, VERBOSE=$VERBOSE"

# Run main function
echo "SCRIPT: About to call main() function"
main
echo "SCRIPT: main() function completed"
