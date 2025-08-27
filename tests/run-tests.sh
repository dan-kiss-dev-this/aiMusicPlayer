#!/bin/bash

# Radio Calico Testing Suite Runner
# File: tests/run-tests.sh

echo "🎵 Radio Calico Testing Suite 🎵"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="/Users/danielkiss/Code/aiMusicPlayer/tests"
COVERAGE_DIR="$TEST_DIR/coverage"
REPORT_FILE="$TEST_DIR/test-report.txt"

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "info")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        "success")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "error")
            echo -e "${RED}❌ $message${NC}"
            ;;
    esac
}

# Function to run test command
run_test() {
    local test_name=$1
    local test_command=$2
    
    print_status "info" "Running $test_name..."
    
    if eval $test_command; then
        print_status "success" "$test_name passed"
        return 0
    else
        print_status "error" "$test_name failed"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "info" "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_status "error" "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_status "error" "npm is not installed"
        exit 1
    fi
    
    # Check if test directory exists
    if [ ! -d "$TEST_DIR" ]; then
        print_status "error" "Test directory not found: $TEST_DIR"
        exit 1
    fi
    
    print_status "success" "Prerequisites check passed"
}

# Function to install dependencies
install_dependencies() {
    print_status "info" "Installing test dependencies..."
    
    cd "$TEST_DIR" || exit 1
    
    if [ ! -f "package.json" ]; then
        print_status "error" "package.json not found in test directory"
        exit 1
    fi
    
    if npm install; then
        print_status "success" "Dependencies installed successfully"
    else
        print_status "error" "Failed to install dependencies"
        exit 1
    fi
}

# Function to run specific test suite
run_test_suite() {
    local suite=$1
    local failed_tests=0
    
    case $suite in
        "backend")
            print_status "info" "🔧 Running Backend Unit Tests"
            run_test "Backend Tests" "npm run test:backend" || ((failed_tests++))
            ;;
        "frontend")
            print_status "info" "🎨 Running Frontend Unit Tests"
            run_test "Frontend Tests" "npm run test:frontend" || ((failed_tests++))
            ;;
        "integration")
            print_status "info" "🔗 Running Integration Tests"
            run_test "Integration Tests" "npm run test:integration" || ((failed_tests++))
            ;;
        "all")
            print_status "info" "🚀 Running All Tests"
            run_test "Complete Test Suite" "npm test" || ((failed_tests++))
            ;;
        "coverage")
            print_status "info" "📊 Running Tests with Coverage"
            run_test "Coverage Analysis" "npm run test:coverage" || ((failed_tests++))
            ;;
        "basic")
            print_status "info" "🧪 Running Basic Configuration Test"
            run_test "Basic Test" "npx jest basic.test.js --verbose" || ((failed_tests++))
            ;;
        *)
            # Try to run as individual test file
            if [ -f "${suite}.test.js" ]; then
                print_status "info" "🔍 Running Individual Test: ${suite}.test.js"
                run_test "${suite} Test" "npx jest ${suite}.test.js --verbose" || ((failed_tests++))
            else
                print_status "error" "Unknown test suite: $suite"
                exit 1
            fi
            ;;
    esac
    
    return $failed_tests
}

# Function to generate test report
generate_report() {
    print_status "info" "Generating test report..."
    
    {
        echo "Radio Calico Test Report"
        echo "======================="
        echo "Generated: $(date)"
        echo "Test Directory: $TEST_DIR"
        echo ""
        
        if [ -f "$COVERAGE_DIR/lcov-report/index.html" ]; then
            echo "Coverage Report: $COVERAGE_DIR/lcov-report/index.html"
            echo ""
        fi
        
        echo "Test Results:"
        echo "============"
        
        # Check if Jest generated any output files
        if [ -f "jest-results.json" ]; then
            echo "Detailed results available in jest-results.json"
        fi
        
        echo ""
        echo "Environment:"
        echo "==========="
        echo "Node.js Version: $(node --version)"
        echo "npm Version: $(npm --version)"
        echo "Operating System: $(uname -s)"
        echo ""
        
    } > "$REPORT_FILE"
    
    print_status "success" "Test report generated: $REPORT_FILE"
}

# Function to open coverage report
open_coverage_report() {
    local coverage_html="$COVERAGE_DIR/lcov-report/index.html"
    
    if [ -f "$coverage_html" ]; then
        print_status "info" "Opening coverage report..."
        
        # Try to open with system default browser
        if command -v open &> /dev/null; then
            open "$coverage_html"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "$coverage_html"
        else
            print_status "warning" "Cannot auto-open browser. Please open: $coverage_html"
        fi
    else
        print_status "warning" "Coverage report not found. Run with --coverage first."
    fi
}

# Function to clean test artifacts
clean_artifacts() {
    print_status "info" "Cleaning test artifacts..."
    
    # Remove coverage directory
    if [ -d "$COVERAGE_DIR" ]; then
        rm -rf "$COVERAGE_DIR"
        print_status "success" "Removed coverage directory"
    fi
    
    # Remove node_modules in test directory
    if [ -d "$TEST_DIR/node_modules" ]; then
        rm -rf "$TEST_DIR/node_modules"
        print_status "success" "Removed test node_modules"
    fi
    
    # Remove test report
    if [ -f "$REPORT_FILE" ]; then
        rm "$REPORT_FILE"
        print_status "success" "Removed test report"
    fi
    
    # Remove Jest cache
    if [ -d "$TEST_DIR/.jest-cache" ]; then
        rm -rf "$TEST_DIR/.jest-cache"
        print_status "success" "Removed Jest cache"
    fi
}

# Function to show help
show_help() {
    echo "Radio Calico Testing Suite Runner"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  backend        Run backend unit tests only"
    echo "  frontend       Run frontend unit tests only"
    echo "  integration    Run integration tests only"
    echo "  all            Run all tests (default)"
    echo "  coverage       Run tests with coverage analysis"
    echo "  basic          Run basic configuration test"
    echo "  install        Install test dependencies only"
    echo "  clean          Clean test artifacts"
    echo "  report         Generate test report only"
    echo "  open-coverage  Open coverage report in browser"
    echo "  help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                 # Run all tests"
    echo "  $0 backend         # Run backend tests only"
    echo "  $0 coverage        # Run with coverage"
    echo "  $0 basic           # Run basic config test"
    echo "  $0 clean           # Clean artifacts"
    echo ""
}

# Main execution
main() {
    local command=${1:-"all"}
    local start_time=$(date +%s)
    
    case $command in
        "help"|"-h"|"--help")
            show_help
            exit 0
            ;;
        "clean")
            clean_artifacts
            exit 0
            ;;
        "install")
            check_prerequisites
            install_dependencies
            exit 0
            ;;
        "report")
            generate_report
            exit 0
            ;;
        "open-coverage")
            open_coverage_report
            exit 0
            ;;
        *)
            # Run tests
            check_prerequisites
            install_dependencies
            
            local failed_tests=0
            run_test_suite "$command" || failed_tests=$?
            
            generate_report
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            echo ""
            print_status "info" "Test execution completed in ${duration}s"
            
            if [ $failed_tests -eq 0 ]; then
                print_status "success" "All tests passed! 🎉"
                
                # Open coverage report if coverage was run
                if [ "$command" = "coverage" ]; then
                    open_coverage_report
                fi
                
                exit 0
            else
                print_status "error" "$failed_tests test suite(s) failed"
                exit 1
            fi
            ;;
    esac
}

# Execute main function with all arguments
main "$@"
