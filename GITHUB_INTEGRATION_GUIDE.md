# GitHub Auto-Route Creation Setup Guide

This guide explains how to set up automatic route creation when adding subjects on Vercel.

## Overview

When you create a new subject in the Subject Management page, the system will:
1. ✅ Create the subject in the database
2. ✅ Generate route files (student + admin pages)
3. ✅ Commit files to GitHub repository
4. ✅ Trigger Vercel auto-deployment

## Setup Steps

### 1. Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name: `Vercel Auto-Route Creation`
4. Set expiration (recommended: 90 days or No expiration)
5. **Required scopes:**
   - ✅ `repo` (Full control of private repositories)
   - This allows creating/committing files

6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again!)

### 2. Add Environment Variables to Vercel

Go to your Vercel project → Settings → Environment Variables:

| Variable | Value | Example |
|----------|-------|---------|
| `GITHUB_TOKEN` | Your personal access token | `ghp_abc123...` |
| `GITHUB_REPO` | Repository in `owner/repo` format | `pks_aito/web-rendering-submission` |
| `GITHUB_BRANCH` | Branch to commit to | `main` |

**Important:** Add these to all environments (Production, Preview, Development)

### 3. Redeploy Your Application

After adding environment variables:
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Select "Redeploy"

## How It Works

### File Structure Created

When you create subject `ITCS999`, these files are auto-generated:

```
src/app/
├── itcs999/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── rendering/
│   │   └── page.tsx
│   └── score/
│       └── page.tsx
└── admin/
    └── itcs999/
        ├── layout.tsx
        ├── page.tsx
        └── tests/
            └── page.tsx
```

### GitHub Commit Process

1. **Create Blobs**: Each file content is uploaded as a Git blob
2. **Create Tree**: New tree with all files is created
3. **Create Commit**: Commit message: `Add routes for ITCS999 subject`
4. **Update Branch**: Branch reference is updated to new commit
5. **Auto-Deploy**: Vercel detects commit and deploys automatically

### Success Messages

**✅ Full Success:**
```
✅ Subject ITCS999 created successfully!

✅ Route files created and committed to GitHub:
src/app/itcs999/layout.tsx
src/app/itcs999/page.tsx
...

Next steps:
1. Wait for Vercel deployment (auto-triggered)
2. Add permissions for users in Account Management
3. Add lab configurations in Lab Management
```

**⚠️ Partial Success (database only):**
```
⚠️ Subject ITCS999 created in database.

❌ Route creation failed: GitHub integration not configured

Manual steps required:
1. Create route folders manually
2. See SUBJECT_ROUTE_TEMPLATES.md for templates
3. Add permissions for users in Account Management
```

## Troubleshooting

### Error: "GitHub integration not configured"

**Cause:** Environment variables not set

**Fix:**
1. Verify `GITHUB_TOKEN` and `GITHUB_REPO` are set in Vercel
2. Redeploy application
3. Check variable names match exactly

### Error: "Failed to get branch"

**Cause:** 
- Wrong repository name
- Token doesn't have `repo` scope
- Repository doesn't exist

**Fix:**
1. Verify `GITHUB_REPO` format: `owner/repo`
2. Check token has `repo` scope
3. Ensure token user has write access to repository

### Error: "Failed to create blob"

**Cause:** API rate limit or permission issue

**Fix:**
1. Wait a few minutes (rate limit reset)
2. Verify token is still valid (not expired)
3. Check repository permissions

### Routes Created but Not Visible

**Cause:** Vercel hasn't deployed yet

**Fix:**
1. Check Vercel Deployments tab
2. Wait for "Ready" status (usually 1-2 minutes)
3. Clear browser cache if needed

## Manual Fallback

If auto-creation fails, you can still create routes manually:

1. Follow templates in `SUBJECT_ROUTE_TEMPLATES.md`
2. Create files in your local environment
3. Commit and push to GitHub
4. Vercel will auto-deploy

## Security Notes

### Token Security

- ✅ **DO:** Store token in Vercel environment variables
- ✅ **DO:** Use token with minimum required scopes (`repo` only)
- ✅ **DO:** Set token expiration (90 days recommended)
- ❌ **DON'T:** Commit token to repository
- ❌ **DON'T:** Share token with others
- ❌ **DON'T:** Use personal account token for organization repos

### Best Practices

1. **Use a dedicated GitHub account** for automation (optional but recommended)
2. **Rotate tokens regularly** (every 90 days)
3. **Monitor commit history** to verify automated commits
4. **Set up branch protection** on main branch (require reviews for manual changes)
5. **Use Vercel preview deployments** to test before merging

## API Endpoint Reference

### POST `/api/subjects/create-routes`

**Request:**
```json
{
  "subjectCode": "ITCS999"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Routes for ITCS999 created and committed",
  "commitSha": "abc123...",
  "filesCreated": [
    "src/app/itcs999/layout.tsx",
    "..."
  ]
}
```

**Response (Error):**
```json
{
  "error": "GitHub integration not configured",
  "message": "Set GITHUB_TOKEN and GITHUB_REPO environment variables"
}
```

## Testing

### Local Testing (Without Committing)

The API endpoint requires authentication and won't work locally without proper GitHub token setup.

### Production Testing

1. Create a test subject (e.g., `TEST001`)
2. Verify files appear in GitHub repository
3. Check Vercel deployment completes
4. Access routes at `/test001` and `/admin/test001`
5. Delete test subject and files after verification

## Limitations

- **Serverless limitations:** Each route creation counts as one serverless function execution
- **Rate limits:** GitHub API has rate limits (5000 requests/hour for authenticated users)
- **File size:** Individual file size limited to 100MB (templates are well under this)
- **Concurrent creates:** Creating multiple subjects simultaneously may cause conflicts

## Alternative: Manual Workflow

If you prefer manual control:

1. **Disable auto-creation:** Don't set `GITHUB_TOKEN` environment variable
2. **Use templates:** Follow `SUBJECT_ROUTE_TEMPLATES.md`
3. **Local development:** Create files locally, test, then commit
4. **Review process:** Use pull requests for subject additions

This gives you full control over code reviews and testing before deployment.
