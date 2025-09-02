#!/bin/bash

# Radio Calico CI/CD Security Audit
# Automated security checking for continuous integration

set -e

# Configuration
CI_MODE=${CI:-false}
FAIL_ON_MODERATE=${FAIL_ON_MODERATE:-true}
FAIL_ON_HIGH=${FAIL_ON_HIGH:-true}
FAIL_ON_CRITICAL=${FAIL_ON_CRITICAL:-true}
REPORTS_DIR="security-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors (disabled in CI)
if [ "$CI_MODE" = "true" ]; then
    RED=''; GREEN=''; YELLOW=''; BLUE=''; NC='';
else
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m';
fi

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# Exit codes
EXIT_CODE=0

log_info "Starting Radio Calico Security Audit (CI Mode: $CI_MODE)"

# Create reports directory
mkdir -p "$REPORTS_DIR"

# 1. NPM Audit with severity checking
log_info "Running npm audit..."

# Main dependencies
if ! npm audit --audit-level=moderate --json > "$REPORTS_DIR/audit-main-$TIMESTAMP.json" 2>/dev/null; then
    AUDIT_EXIT_CODE=$?
    
    # Parse audit results
    if [ -f "$REPORTS_DIR/audit-main-$TIMESTAMP.json" ]; then
        CRITICAL=$(jq '.vulnerabilities | to_entries | map(select(.value.severity == "critical")) | length' "$REPORTS_DIR/audit-main-$TIMESTAMP.json" 2>/dev/null || echo "0")
        HIGH=$(jq '.vulnerabilities | to_entries | map(select(.value.severity == "high")) | length' "$REPORTS_DIR/audit-main-$TIMESTAMP.json" 2>/dev/null || echo "0")
        MODERATE=$(jq '.vulnerabilities | to_entries | map(select(.value.severity == "moderate")) | length' "$REPORTS_DIR/audit-main-$TIMESTAMP.json" 2>/dev/null || echo "0")
        
        log_warn "Main dependencies audit found vulnerabilities:"
        log_warn "  Critical: $CRITICAL"
        log_warn "  High: $HIGH" 
        log_warn "  Moderate: $MODERATE"
        
        # Check if we should fail
        if [ "$FAIL_ON_CRITICAL" = "true" ] && [ "$CRITICAL" -gt 0 ]; then
            log_error "Critical vulnerabilities found in main dependencies"
            EXIT_CODE=1
        fi
        
        if [ "$FAIL_ON_HIGH" = "true" ] && [ "$HIGH" -gt 0 ]; then
            log_error "High severity vulnerabilities found in main dependencies"
            EXIT_CODE=1
        fi
        
        if [ "$FAIL_ON_MODERATE" = "true" ] && [ "$MODERATE" -gt 0 ]; then
            log_error "Moderate severity vulnerabilities found in main dependencies"
            EXIT_CODE=1
        fi
    else
        log_error "Failed to generate audit report for main dependencies"
        EXIT_CODE=1
    fi
else
    log_success "No vulnerabilities found in main dependencies"
fi

# Test dependencies
cd tests
if ! npm audit --audit-level=moderate --json > "../$REPORTS_DIR/audit-tests-$TIMESTAMP.json" 2>/dev/null; then
    AUDIT_EXIT_CODE=$?
    
    if [ -f "../$REPORTS_DIR/audit-tests-$TIMESTAMP.json" ]; then
        CRITICAL_TEST=$(jq '.vulnerabilities | to_entries | map(select(.value.severity == "critical")) | length' "../$REPORTS_DIR/audit-tests-$TIMESTAMP.json" 2>/dev/null || echo "0")
        HIGH_TEST=$(jq '.vulnerabilities | to_entries | map(select(.value.severity == "high")) | length' "../$REPORTS_DIR/audit-tests-$TIMESTAMP.json" 2>/dev/null || echo "0")
        MODERATE_TEST=$(jq '.vulnerabilities | to_entries | map(select(.value.severity == "moderate")) | length' "../$REPORTS_DIR/audit-tests-$TIMESTAMP.json" 2>/dev/null || echo "0")
        
        log_warn "Test dependencies audit found vulnerabilities:"
        log_warn "  Critical: $CRITICAL_TEST"
        log_warn "  High: $HIGH_TEST"
        log_warn "  Moderate: $MODERATE_TEST"
        
        # Test dependencies are less critical, but still warn
        if [ "$CRITICAL_TEST" -gt 0 ] || [ "$HIGH_TEST" -gt 0 ]; then
            log_warn "High/Critical vulnerabilities in test dependencies should be addressed"
        fi
    else
        log_warn "Failed to generate audit report for test dependencies"
    fi
else
    log_success "No vulnerabilities found in test dependencies"
fi
cd ..

# 2. Check for hardcoded secrets
log_info "Scanning for hardcoded secrets..."

SECRET_SCAN_FILE="$REPORTS_DIR/secrets-scan-$TIMESTAMP.txt"
if grep -r -i --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=security-reports \
    --exclude="*.log" --exclude="*.json" \
    "password.*=.*['\"][^'\"]*['\"]" . > "$SECRET_SCAN_FILE" 2>/dev/null; then
    
    # Filter out test files and known safe patterns
    if grep -v "test\|spec\|example\|placeholder\|process\.env" "$SECRET_SCAN_FILE" > "$SECRET_SCAN_FILE.filtered"; then
        if [ -s "$SECRET_SCAN_FILE.filtered" ]; then
            log_error "Potential hardcoded secrets found:"
            cat "$SECRET_SCAN_FILE.filtered"
            EXIT_CODE=1
        else
            log_success "No hardcoded secrets detected"
        fi
    else
        log_success "No hardcoded secrets detected"
    fi
else
    log_success "No hardcoded secrets detected"
fi

# 3. Check environment configuration
log_info "Checking environment security configuration..."

ENV_ISSUES=0

# Check for .env file with proper permissions
if [ -f ".env" ]; then
    PERMS=$(stat -f "%A" .env 2>/dev/null || stat -c "%a" .env 2>/dev/null)
    if [ "$PERMS" -gt 600 ]; then
        log_warn ".env file has overly permissive permissions ($PERMS)"
        ENV_ISSUES=$((ENV_ISSUES + 1))
    fi
    
    # Check for default values
    if grep -q "password.*=.*password\|secret.*=.*secret" .env 2>/dev/null; then
        log_error "Default/weak values detected in .env file"
        ENV_ISSUES=$((ENV_ISSUES + 1))
        EXIT_CODE=1
    fi
fi

# Check critical file permissions
for file in server.js package.json; do
    if [ -f "$file" ]; then
        # Use Linux stat syntax for CI (GitHub Actions uses Linux)
        if command -v stat >/dev/null 2>&1; then
            PERMS=$(stat -c "%a" "$file" 2>/dev/null || echo "644")
            if [ "$PERMS" -gt 644 ] 2>/dev/null; then
                log_warn "$file has overly permissive permissions ($PERMS)"
                ENV_ISSUES=$((ENV_ISSUES + 1))
            fi
        fi
    fi
done

if [ $ENV_ISSUES -eq 0 ]; then
    log_success "Environment configuration security looks good"
fi

# 4. Generate CI summary
log_info "Generating CI summary..."

SUMMARY_FILE="$REPORTS_DIR/ci-security-summary-$TIMESTAMP.json"

cat > "$SUMMARY_FILE" << EOF
{
  "scan_date": "$(date -Iseconds)",
  "scan_timestamp": "$TIMESTAMP",
  "ci_mode": $CI_MODE,
  "exit_code": $EXIT_CODE,
  "vulnerabilities": {
    "main_dependencies": {
      "critical": ${CRITICAL:-0},
      "high": ${HIGH:-0},
      "moderate": ${MODERATE:-0}
    },
    "test_dependencies": {
      "critical": ${CRITICAL_TEST:-0},
      "high": ${HIGH_TEST:-0},
      "moderate": ${MODERATE_TEST:-0}
    }
  },
  "security_issues": {
    "hardcoded_secrets": $([ -s "$SECRET_SCAN_FILE.filtered" ] && echo "true" || echo "false"),
    "environment_issues": $ENV_ISSUES
  },
  "reports": {
    "audit_main": "audit-main-$TIMESTAMP.json",
    "audit_tests": "audit-tests-$TIMESTAMP.json",
    "secrets_scan": "secrets-scan-$TIMESTAMP.txt",
    "summary": "ci-security-summary-$TIMESTAMP.json"
  },
  "recommendations": [
    $([ $EXIT_CODE -ne 0 ] && echo '"Fix critical and high severity vulnerabilities",' || echo "")
    $([ ${CRITICAL:-0} -gt 0 ] && echo '"Address critical vulnerabilities immediately",' || echo "")
    $([ ${HIGH:-0} -gt 0 ] && echo '"Address high severity vulnerabilities",' || echo "")
    $([ $ENV_ISSUES -gt 0 ] && echo '"Fix environment configuration issues",' || echo "")
    "Regularly update dependencies",
    "Monitor security advisories",
    "Run security scans in CI/CD pipeline"
  ]
}
EOF

# 5. Output results
if [ "$CI_MODE" = "true" ]; then
    # Machine-readable output for CI
    # Use new GitHub Actions output format instead of deprecated set-output
    echo "exit_code=$EXIT_CODE" >> $GITHUB_OUTPUT
    echo "summary_file=$SUMMARY_FILE" >> $GITHUB_OUTPUT
    
    if [ $EXIT_CODE -ne 0 ]; then
        echo "::error::Security vulnerabilities detected. Check $SUMMARY_FILE for details."
    fi
else
    # Human-readable output
    log_info "Security audit completed"
    log_info "Summary saved to: $SUMMARY_FILE"
    
    if [ $EXIT_CODE -ne 0 ]; then
        log_error "Security audit failed with exit code $EXIT_CODE"
        log_error "Please address the security issues and run the audit again"
    else
        log_success "Security audit passed!"
    fi
fi

exit $EXIT_CODE
