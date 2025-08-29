# 🤖 Claude AI Integration Setup Guide

This guide helps you set up Claude AI integration with your GitHub Actions workflows for intelligent code review and automation.

## 🚀 Quick Start

### 1. **Get Anthropic API Key**

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the key (starts with `sk-ant-api03-...`)

### 2. **Add GitHub Secret**

1. Go to your repository settings
2. Navigate to **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `ANTHROPIC_API_KEY`
5. Value: Your Claude API key
6. Click **Add secret**

### 3. **Enable Workflows**

```bash
# Add and commit the AI workflows
ga.
gcm "Add Claude AI integration to GitHub Actions"
git push origin main
```

## 🔧 Features

### **AI Code Review** (`ai-review.yml`)

**Triggers:**
- Pull requests (opened, synchronized)
- Manual workflow dispatch

**Capabilities:**
- 🔍 Analyzes changed files
- 🛡️ Security assessment
- 📈 Performance suggestions
- 💡 Code quality recommendations
- 📝 Automated PR comments

**Example Output:**
```markdown
## 🤖 Claude AI Code Review for `server.js`

### 🔍 Key Observations
- Proper error handling implemented
- SQL injection prevention measures detected
- Consider adding rate limiting

### 💡 Recommendations
1. Add input validation for user data
2. Implement request logging
3. Consider caching frequently accessed data
```

### **AI Documentation Generation**

**Manual Trigger:**
```bash
gh workflow run ai-review.yml
```

**Generates:**
- 📖 API documentation
- 🏗️ Project structure analysis  
- 💡 Improvement recommendations
- 📋 Automated PR with updates

## 🎯 Integration Points

### **With Existing CI/CD:**
- Runs after successful tests
- Provides AI insights on code quality
- Generates reports for manual review
- Integrates with security scans

### **With Pull Request Workflow:**
- Automatic code review comments
- Breaking change detection
- Security vulnerability highlights
- Performance optimization suggestions

## 📊 Usage Examples

### **Manual AI Review:**
```bash
# Trigger AI review on current branch
gh workflow run ai-review.yml

# Check workflow status
gh run list --workflow=ai-review.yml
```

### **View AI Analysis:**
```bash
# Download latest AI analysis
gh run download --name claude-ai-analysis

# View the analysis
cat ai_analysis.md
```

## 🔒 Security & Privacy

### **Data Handling:**
- Code snippets sent to Anthropic API
- No persistent storage of code by Claude
- API calls encrypted in transit
- GitHub secrets securely managed

### **Best Practices:**
- Never commit API keys to repository
- Use GitHub secrets for sensitive data
- Regularly rotate API keys
- Monitor API usage and costs

### **Privacy Controls:**
- AI analysis runs only on changed files
- Sensitive files can be excluded
- Manual approval for private repositories
- Audit trail in GitHub Actions logs

## 🎛️ Configuration Options

### **Customize Analysis Scope:**

Edit `.github/workflows/ai-review.yml`:

```yaml
# Include/exclude file patterns
files: |
  **/*.js
  **/*.ts
  **/*.py
  !**/node_modules/**
  !**/secrets/**
```

### **Adjust AI Model:**

```python
# In the analysis script, change model:
model="claude-3-sonnet-20240229"  # Balanced
model="claude-3-opus-20240229"    # Most capable
model="claude-3-haiku-20240307"   # Fastest
```

### **Custom Prompts:**

```python
prompt = f"""
You are a senior software engineer reviewing code for a music player application.

Focus on:
1. Node.js best practices
2. PostgreSQL security
3. Docker optimization
4. Authentication vulnerabilities

Code to review:
{content}
"""
```

## 📈 Monitoring & Costs

### **API Usage Tracking:**
- Monitor via Anthropic Console
- Set up billing alerts
- Track tokens per workflow run

### **GitHub Actions Minutes:**
- AI workflows add ~2-5 minutes per run
- Optimized for efficiency
- Caching reduces repeated analysis

### **Cost Optimization:**
- Run AI analysis only on significant changes
- Exclude documentation-only PRs
- Use faster models for quick feedback
- Implement file size limits

## 🛠️ Troubleshooting

### **Common Issues:**

**1. API Key Not Working:**
```bash
# Verify secret is set
gh secret list

# Test API key locally
curl -H "x-api-key: YOUR_KEY" https://api.anthropic.com/v1/messages
```

**2. Workflow Not Triggering:**
```yaml
# Check trigger conditions
on:
  pull_request:
    types: [opened, synchronize]  # Ensure correct types
```

**3. Analysis Too Large:**
```python
# Truncate content for API limits
content = content[:5000] if len(content) > 5000 else content
```

### **Debugging Steps:**
1. Check workflow run logs
2. Verify GitHub secrets
3. Test API key validity
4. Review file change detection
5. Check permissions

## 🚀 Advanced Features

### **Custom AI Workflows:**

Create specialized AI workflows for:
- 🔒 Security-focused reviews
- 📈 Performance analysis
- 📚 Documentation generation
- 🧪 Test quality assessment

### **Integration with Tools:**
- Combine with ESLint results
- Merge with security scan findings
- Integrate with test coverage
- Connect to dependency analysis

### **Team Workflows:**
- AI-generated PR templates
- Automated reviewer assignment
- Code quality scoring
- Technical debt tracking

## 📚 Resources

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Claude Model Comparison](https://docs.anthropic.com/claude/docs/models-overview)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Security Best Practices](https://docs.github.com/en/actions/security-guides)

---

**Need Help?** Check the workflow logs or create an issue for support.

*🤖 This integration brings AI-powered insights to your development workflow!*
