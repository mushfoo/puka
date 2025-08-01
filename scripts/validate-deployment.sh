#!/bin/bash

# Deployment validation script for Railway
# Validates that the deployed application is working correctly

set -e

# Check if script has executable permissions
if [ ! -x "$0" ]; then
    echo "⚠️  Warning: Script may not have executable permissions"
    echo "💡 Run: chmod +x $0"
    echo ""
fi

# Configuration
DEPLOYMENT_URL=${1:-"http://localhost:3000"}
TIMEOUT=${TIMEOUT:-30}
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

# Test functions
test_basic_connectivity() {
    log_info "Testing basic connectivity to $DEPLOYMENT_URL"

    if curl -f -s --max-time $TIMEOUT "$DEPLOYMENT_URL" > /dev/null; then
        log_success "✅ Basic connectivity test passed"
        return 0
    else
        log_error "❌ Basic connectivity test failed"
        return 1
    fi
}

test_health_endpoint() {
    log_info "Testing health check endpoint"

    local response=$(curl -f -s --max-time $TIMEOUT "$DEPLOYMENT_URL/health.json")
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$status" = "ok" ]; then
            log_success "✅ Health check endpoint test passed"
            log_verbose "Health response: $response"
            return 0
        else
            log_error "❌ Health check returned status: $status"
            return 1
        fi
    else
        log_error "❌ Health check endpoint test failed"
        return 1
    fi
}

test_detailed_health() {
    log_info "Testing detailed health check endpoint"

    local response=$(curl -f -s --max-time $TIMEOUT "$DEPLOYMENT_URL/api/health/detailed")
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [[ "$status" =~ ^(healthy|degraded)$ ]]; then
            log_success "✅ Detailed health check test passed (status: $status)"

            # Check individual components
            local db_status=$(echo "$response" | grep -o '"database":{"status":"[^"]*"' | cut -d'"' -f6)
            local auth_status=$(echo "$response" | grep -o '"authentication":{"status":"[^"]*"' | cut -d'"' -f6)

            log_verbose "Database status: $db_status"
            log_verbose "Authentication status: $auth_status"

            return 0
        else
            log_warning "⚠️  Detailed health check returned status: $status"
            log_verbose "Response: $response"
            return 1
        fi
    else
        log_error "❌ Detailed health check endpoint test failed"
        return 1
    fi
}

test_api_endpoints() {
    log_info "Testing API endpoints"

    # Test basic API health
    local response=$(curl -f -s --max-time $TIMEOUT "$DEPLOYMENT_URL/api/health")
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$status" = "ok" ]; then
            log_success "✅ API health endpoint test passed"
        else
            log_warning "⚠️  API health returned status: $status"
        fi
    else
        log_error "❌ API health endpoint test failed"
        return 1
    fi

    # Test 404 handling
    local not_found_response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$DEPLOYMENT_URL/api/nonexistent")
    local http_code="${not_found_response: -3}"

    if [ "$http_code" = "404" ]; then
        log_success "✅ API 404 handling test passed"
    else
        log_warning "⚠️  API 404 handling returned code: $http_code"
    fi

    return 0
}

test_static_files() {
    log_info "Testing static file serving"

    # Test main HTML file
    if curl -f -s --max-time $TIMEOUT "$DEPLOYMENT_URL/" | grep -q "<!DOCTYPE html>"; then
        log_success "✅ Static HTML serving test passed"
    else
        log_error "❌ Static HTML serving test failed"
        return 1
    fi

    # Test manifest.json
    local manifest_response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$DEPLOYMENT_URL/manifest.json")
    local manifest_code="${manifest_response: -3}"

    if [ "$manifest_code" = "200" ]; then
        log_success "✅ Manifest.json serving test passed"
    else
        log_verbose "Manifest.json returned code: $manifest_code (may not exist)"
    fi

    return 0
}

test_security_headers() {
    log_info "Testing security headers"

    local headers=$(curl -s -I --max-time $TIMEOUT "$DEPLOYMENT_URL/")

    if echo "$headers" | grep -q "X-Content-Type-Options: nosniff"; then
        log_success "✅ X-Content-Type-Options header present"
    else
        log_warning "⚠️  X-Content-Type-Options header missing"
    fi

    if echo "$headers" | grep -q "X-Frame-Options: DENY"; then
        log_success "✅ X-Frame-Options header present"
    else
        log_warning "⚠️  X-Frame-Options header missing"
    fi

    if echo "$headers" | grep -q "Content-Security-Policy:"; then
        log_success "✅ Content-Security-Policy header present"
    else
        log_warning "⚠️  Content-Security-Policy header missing"
    fi

    return 0
}

test_authentication_routes() {
    log_info "Testing authentication routes"

    # Test auth session endpoint
    local auth_response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$DEPLOYMENT_URL/api/auth/session")
    local auth_code="${auth_response: -3}"

    if [[ "$auth_code" =~ ^(200|401|403)$ ]]; then
        log_success "✅ Authentication routes test passed (code: $auth_code)"
    else
        log_error "❌ Authentication routes test failed (code: $auth_code)"
        return 1
    fi

    return 0
}

test_performance() {
    log_info "Testing response performance"

    local start_time=$(date +%s%N)
    curl -f -s --max-time $TIMEOUT "$DEPLOYMENT_URL/health.json" > /dev/null
    local end_time=$(date +%s%N)

    local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

    if [ $duration -lt 2000 ]; then
        log_success "✅ Performance test passed (${duration}ms)"
    else
        log_warning "⚠️  Performance test slow (${duration}ms)"
    fi

    return 0
}

# Main validation function
main() {
    log_info "🚀 Starting deployment validation for: $DEPLOYMENT_URL"
    log_info "Timeout: ${TIMEOUT}s"
    echo ""

    local failed_tests=0
    local total_tests=0

    # Run all tests
    tests=(
        "test_basic_connectivity"
        "test_health_endpoint"
        "test_detailed_health"
        "test_api_endpoints"
        "test_static_files"
        "test_security_headers"
        "test_authentication_routes"
        "test_performance"
    )

    for test in "${tests[@]}"; do
        total_tests=$((total_tests + 1))
        if ! $test; then
            failed_tests=$((failed_tests + 1))
        fi
        echo ""
    done

    # Summary
    local passed_tests=$((total_tests - failed_tests))
    log_info "📊 Validation Summary:"
    log_info "   Total tests: $total_tests"
    log_success "   Passed: $passed_tests"

    if [ $failed_tests -gt 0 ]; then
        log_error "   Failed: $failed_tests"
        log_error "❌ Deployment validation failed"
        exit 1
    else
        log_success "✅ All deployment validation tests passed!"
        log_success "🎉 Deployment is ready for production use"
        exit 0
    fi
}

# Help function
show_help() {
    cat << EOF
Deployment Validation Script for Puka Reading Tracker

Usage: $0 [DEPLOYMENT_URL] [OPTIONS]

Arguments:
    DEPLOYMENT_URL      URL to validate (default: http://localhost:3000)

Environment Variables:
    TIMEOUT            Request timeout in seconds (default: 30)
    VERBOSE            Enable verbose logging (default: true)

Examples:
    $0                                          # Validate localhost
    $0 https://puka-staging.up.railway.app     # Validate staging
    $0 https://puka-production.up.railway.app  # Validate production
    TIMEOUT=60 $0 https://my-app.com           # Custom timeout
EOF
}

# Parse command line arguments
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# Run main function
main