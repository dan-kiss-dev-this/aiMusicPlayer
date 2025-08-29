# Claude AI Integration Guide

This document describes the Claude AI code review integration for the Radio Calico project.

## Overview

The Claude AI integration provides automated code review capabilities using Anthropic's Claude AI model. It analyzes pull requests and provides comprehensive feedback on code quality, security, architecture, and best practices.

## Features

### 🔍 Automated Code Review
- **Comprehensive Analysis**: Reviews code quality, security, architecture, and testing
- **Multi-language Support**: Supports JavaScript, TypeScript, Python, and more
- **Context-Aware**: Uses project context and documentation for better reviews
- **Diff Analysis**: Focuses on changed code while considering full file context

### 🚀 Smart Triggering
- **Pull Request Events**: Automatically triggered on PR open, sync, and reopen
- **Manual Dispatch**: Can be manually triggered for specific PRs
- **Follow-up Analysis**: Analyzes human review comments for additional insights
- **File Filtering**: Only reviews relevant file types to optimize performance

### 🔒 Security Focus
- **Security Vulnerability Detection**: Identifies potential security issues
- **Input Validation**: Checks for proper input validation patterns
- **Authentication Review**: Analyzes auth/authorization implementations
- **SQL Injection Prevention**: Reviews database query patterns

## Setup Instructions

### 1. Prerequisites

- GitHub repository with GitHub Actions enabled
- Anthropic API key with Claude access
- Proper repository permissions for the workflow

### 2. Configuration

#### Required Secrets

Add these secrets to your GitHub repository settings:

```
ANTHROPIC_API_KEY - Your Anthropic API key for Claude access
```

#### Repository Permissions

Ensure the following permissions are enabled:
- `contents: read` - Read repository content
- `pull-requests: write` - Comment on pull requests
- `issues: write` - Create and update issues

### 3. Workflow Files

The integration consists of one main workflow file:

- `.github/workflows/ai-review.yml` - Main Claude AI review workflow

## Usage

### Automatic Reviews

The workflow automatically runs on:
- New pull requests to `main` or `develop` branches
- Pull request updates (new commits)
- Pull request reopening

### Manual Reviews

To manually trigger a review:

1. Go to the "Actions" tab in your repository
2. Select "Claude AI Code Review" workflow
3. Click "Run workflow"
4. Enter the PR number you want to review
5. Click "Run workflow"

### Review Output

Claude provides structured feedback in the following format:

#### 🔍 Code Review Summary
- **Positive Aspects**: What's working well
- **Issues Found**: Problems categorized by severity (HIGH/MEDIUM/LOW)
- **Recommendations**: Specific improvement suggestions
- **Security Notes**: Security-related observations
- **Additional Notes**: Other relevant observations

## Configuration Options

### File Type Filtering

Currently reviews these file types:
- JavaScript/TypeScript: `.js`, `.ts`, `.jsx`, `.tsx`
- Python: `.py`
- Java: `.java`
- C/C++: `.cpp`, `.c`, `.h`
- Styles: `.css`, `.scss`
- Data: `.sql`, `.json`, `.yml`, `.yaml`
- Documentation: `.md`

### Review Scope

- **Maximum Files**: 20 files per review (to manage API token limits)
- **Context Inclusion**: Includes project README and package.json for context
- **Diff Analysis**: Focuses on changed lines while considering full file context

## Best Practices

### For Developers

1. **Review AI Feedback**: Always review Claude's suggestions carefully
2. **Human Judgment**: Use AI feedback as guidance, not absolute truth
3. **Address High Priority**: Focus on HIGH severity issues first
4. **Security First**: Pay special attention to security recommendations
5. **Documentation**: Keep README and documentation updated for better AI context

### For Project Maintainers

1. **API Key Security**: Keep the Anthropic API key secure and rotate regularly
2. **Monitor Usage**: Track API usage to manage costs
3. **Workflow Updates**: Keep the workflow updated with latest Claude models
4. **Review Quality**: Periodically assess the quality of AI reviews
5. **Team Training**: Ensure team understands how to interpret AI feedback

## Troubleshooting

### Common Issues

#### Review Not Triggered
- Check that PR targets `main` or `develop` branch
- Verify workflow file syntax is correct
- Ensure repository has Actions enabled

#### API Errors
- Verify `ANTHROPIC_API_KEY` secret is set correctly
- Check API key has sufficient quota
- Review error logs in Actions tab

#### No Files to Review
- Workflow skips if no relevant file types changed
- Check file extensions match the filter list
- Binary files and some formats are excluded

#### Large PR Issues
- Reviews are limited to 20 files maximum
- Large diffs may hit API token limits
- Consider breaking large PRs into smaller ones

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "No relevant files to review" | No supported file types changed | Normal behavior, no action needed |
| "Claude API call failed" | API authentication or quota issue | Check API key and usage limits |
| "Request too large" | PR diff exceeds token limits | Break PR into smaller changes |

## Advanced Configuration

### Custom Review Prompts

To customize the review criteria, modify the `claude_prompt.txt` section in the workflow:

```yaml
# In .github/workflows/ai-review.yml
# Modify the prompt in the "Claude AI Review" step
```

### Additional Models

To use different Claude models, update the API call:

```json
{
  "model": "claude-3-opus-20240229",  // For more detailed reviews
  "model": "claude-3-haiku-20240307", // For faster reviews
  "max_tokens": 4000
}
```

### Integration with Other Tools

The workflow can be extended to integrate with:
- Security scanning tools
- Performance analysis
- Documentation generators
- Test coverage tools

## API Usage and Costs

### Token Usage
- Average review: 2,000-4,000 tokens
- Large PRs: Up to 8,000 tokens
- Context overhead: ~1,000 tokens

### Cost Estimation
- Based on Anthropic's current pricing
- Monitor usage through GitHub Actions logs
- Consider setting up usage alerts

## Support and Maintenance

### Regular Maintenance
- Update Claude model versions quarterly
- Review and update prompts based on team feedback
- Monitor API usage and costs
- Update file type filters as needed

### Getting Help
- Check GitHub Actions logs for detailed error information
- Review Anthropic API documentation for API issues
- Open issues in the repository for workflow problems

## Examples

### Successful Review Output
```markdown
## 🤖 Claude AI Code Review

### ✅ Positive Aspects
- Good error handling in the authentication middleware
- Clear variable naming and function structure
- Proper use of async/await patterns

### ⚠️ Issues Found
- HIGH: SQL query vulnerable to injection in line 45
- MEDIUM: Missing input validation for user email
- LOW: Consider using const instead of let for immutable variables

### 🚀 Recommendations
- Implement parameterized queries for database operations
- Add email validation using a robust library
- Use ESLint to enforce const usage
```

### Integration with CI/CD
The Claude review integrates with the existing CI/CD pipeline and complements:
- Unit tests
- Security scans
- Code quality checks
- Manual reviews

## Version History

- **v1.0**: Initial Claude integration with basic review capabilities
- **v1.1**: Added security focus and file filtering
- **v1.2**: Enhanced context awareness and error handling
- **v1.3**: Added manual dispatch and follow-up analysis

---

*This integration is designed to enhance code quality and security while maintaining development velocity. Always combine AI insights with human expertise for the best results.*