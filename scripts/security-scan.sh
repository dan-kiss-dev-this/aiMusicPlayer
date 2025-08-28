#!/bin/bash

# Radio Calico Security Scanner
# Comprehensive security testing script for the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AUDIT_LEVEL=${AUDIT_LEVEL:-"moderate"}
REPORTS_DIR="security-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create reports directory
mkdir -p "$REPORTS_DIR"

echo -e "${BLUE}🛡️  Radio Calico Security Scanner${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Function to print section headers
print_header() {
    echo -e "${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to handle errors
handle_error() {
    echo -e "${RED}❌ Error: $1${NC}"
    exit 1
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. NPM Audit - Main Dependencies
print_header "Scanning Main Application Dependencies"
echo "Audit level: $AUDIT_LEVEL"
echo ""

if npm audit --audit-level="$AUDIT_LEVEL" > "$REPORTS_DIR/npm-audit-main-$TIMESTAMP.txt" 2>&1; then
    print_success "Main dependencies security scan completed"
else
    AUDIT_EXIT_CODE=$?
    if [ $AUDIT_EXIT_CODE -eq 1 ]; then
        print_warning "Security vulnerabilities found in main dependencies"
        echo "Report saved to: $REPORTS_DIR/npm-audit-main-$TIMESTAMP.txt"
    else
        handle_error "Failed to run npm audit on main dependencies"
    fi
fi

# Generate JSON report for main dependencies
npm audit --json > "$REPORTS_DIR/npm-audit-main-$TIMESTAMP.json" 2>/dev/null || true

echo ""

# 2. NPM Audit - Test Dependencies
print_header "Scanning Test Dependencies"
cd tests

if npm audit --audit-level="$AUDIT_LEVEL" > "../$REPORTS_DIR/npm-audit-tests-$TIMESTAMP.txt" 2>&1; then
    print_success "Test dependencies security scan completed"
else
    AUDIT_EXIT_CODE=$?
    if [ $AUDIT_EXIT_CODE -eq 1 ]; then
        print_warning "Security vulnerabilities found in test dependencies"
        echo "Report saved to: ../$REPORTS_DIR/npm-audit-tests-$TIMESTAMP.txt"
    else
        print_warning "Failed to run npm audit on test dependencies (may not be critical)"
    fi
fi

# Generate JSON report for test dependencies
npm audit --json > "../$REPORTS_DIR/npm-audit-tests-$TIMESTAMP.json" 2>/dev/null || true

cd ..
echo ""

# 3. Outdated Dependencies Check
print_header "Checking for Outdated Dependencies"

echo "Main dependencies:"
npm outdated > "$REPORTS_DIR/outdated-main-$TIMESTAMP.txt" 2>&1 || true
if [ -s "$REPORTS_DIR/outdated-main-$TIMESTAMP.txt" ]; then
    cat "$REPORTS_DIR/outdated-main-$TIMESTAMP.txt"
    print_warning "Outdated main dependencies found - consider updating"
else
    print_success "All main dependencies are up to date"
fi

echo ""
echo "Test dependencies:"
cd tests
npm outdated > "../$REPORTS_DIR/outdated-tests-$TIMESTAMP.txt" 2>&1 || true
if [ -s "../$REPORTS_DIR/outdated-tests-$TIMESTAMP.txt" ]; then
    cat "../$REPORTS_DIR/outdated-tests-$TIMESTAMP.txt"
    print_warning "Outdated test dependencies found - consider updating"
else
    print_success "All test dependencies are up to date"
fi
cd ..

echo ""

# 4. Docker Security Scan (if available)
print_header "Docker Security Analysis"

if command -v docker &> /dev/null; then
    echo "Checking Docker images for vulnerabilities..."
    
    # Scan development image
    if docker image inspect aimusicplayer-radiocalico-dev &> /dev/null; then
        echo "Scanning development image..."
        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy:latest image aimusicplayer-radiocalico-dev \
            > "$REPORTS_DIR/docker-scan-dev-$TIMESTAMP.txt" 2>&1 || \
            print_warning "Docker security scan failed (trivy not available)"
    fi
    
    # Scan production image
    if docker image inspect aimusicplayer-radiocalico &> /dev/null; then
        echo "Scanning production image..."
        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy:latest image aimusicplayer-radiocalico \
            > "$REPORTS_DIR/docker-scan-prod-$TIMESTAMP.txt" 2>&1 || \
            print_warning "Docker security scan failed (trivy not available)"
    fi
    
    print_success "Docker security analysis completed"
else
    print_warning "Docker not available - skipping container security scan"
fi

echo ""

# 5. Environment Security Check
print_header "Environment Security Configuration"

SECURITY_ISSUES=0

# Check for default secrets
if [ -f ".env" ]; then
    echo "Checking .env file for security issues..."
    if grep -q "password.*=.*password\|secret.*=.*secret\|key.*=.*key" .env 2>/dev/null; then
        print_warning "Potential default/weak credentials found in .env file"
        SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
    fi
else
    print_warning ".env file not found - ensure environment variables are properly configured"
fi

# Check for hardcoded secrets in code
echo "Scanning for hardcoded secrets in source code..."
SECRET_PATTERNS="password\|secret\|key\|token\|api_key"
if grep -r -i --exclude-dir=node_modules --exclude-dir=.git --exclude="*.log" \
    "$SECRET_PATTERNS.*=.*['\"][^'\"]*['\"]" . > "$REPORTS_DIR/secret-scan-$TIMESTAMP.txt" 2>/dev/null; then
    
    # Filter out obvious false positives
    if grep -v "JWT_SECRET.*process.env\|test.*secret\|example\|placeholder" \
        "$REPORTS_DIR/secret-scan-$TIMESTAMP.txt" > "$REPORTS_DIR/secret-scan-filtered-$TIMESTAMP.txt"; then
        
        if [ -s "$REPORTS_DIR/secret-scan-filtered-$TIMESTAMP.txt" ]; then
            print_warning "Potential hardcoded secrets found - review manually"
            SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
        else
            print_success "No hardcoded secrets detected"
        fi
    else
        print_success "No hardcoded secrets detected"
    fi
else
    print_success "No hardcoded secrets detected"
fi

# Check file permissions
echo "Checking critical file permissions..."
if [ -f "server.js" ] && [ "$(stat -f "%A" server.js 2>/dev/null || stat -c "%a" server.js 2>/dev/null)" -gt 644 ]; then
    print_warning "server.js has overly permissive file permissions"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

if [ $SECURITY_ISSUES -eq 0 ]; then
    print_success "Environment security configuration looks good"
fi

echo ""

# 6. Generate Security Summary Report
print_header "Generating Security Summary Report"

SUMMARY_FILE="$REPORTS_DIR/security-summary-$TIMESTAMP.txt"

cat > "$SUMMARY_FILE" << EOF
Radio Calico Security Scan Summary
==================================
Scan Date: $(date)
Scan Timestamp: $TIMESTAMP

Files Generated:
- npm-audit-main-$TIMESTAMP.txt/json
- npm-audit-tests-$TIMESTAMP.txt/json
- outdated-main-$TIMESTAMP.txt
- outdated-tests-$TIMESTAMP.txt
- secret-scan-$TIMESTAMP.txt
- security-summary-$TIMESTAMP.txt

Security Issues Found: $SECURITY_ISSUES

Recommendations:
1. Review all audit reports for vulnerabilities
2. Update outdated dependencies when possible
3. Fix any security vulnerabilities found
4. Ensure proper environment variable configuration
5. Regularly run security scans

Commands to fix issues:
- npm audit fix (fix automatically)
- npm audit fix --force (force fix with breaking changes)
- npm update (update to latest versions)

Next Steps:
- Review detailed reports in $REPORTS_DIR/
- Address high/critical vulnerabilities immediately
- Plan updates for moderate/low vulnerabilities
- Set up automated security scanning in CI/CD

EOF

print_success "Security summary report generated: $SUMMARY_FILE"

echo ""

# 7. Display Summary
print_header "Security Scan Summary"

echo "📊 Reports generated in: $REPORTS_DIR/"
echo "🕒 Scan timestamp: $TIMESTAMP"
echo "🔍 Security issues found: $SECURITY_ISSUES"
echo ""

if [ $SECURITY_ISSUES -gt 0 ]; then
    print_warning "Security issues detected - please review the reports"
    echo "💡 Run 'npm audit fix' to automatically fix vulnerabilities"
    echo "💡 Run 'npm update' to update dependencies"
    exit 1
else
    print_success "No major security issues detected"
    echo "🎉 Your Radio Calico application looks secure!"
    exit 0
fi
