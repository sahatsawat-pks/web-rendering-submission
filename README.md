# GitHub Lab Submission Viewer

A Next.js application for viewing student lab submissions from private GitHub repositories in the MUICT-Class organization.

## Features

- 🎓 **Student Submission Viewer**: Fetch and render HTML files from GitHub repositories
- 🔐 **Admin Authentication**: JWT-based secure authentication system
- 📚 **Lab Management**: Create, edit, and manage lab assignments
- 🎨 **Modern UI**: Beautiful gradient design with dark mode support
- 🔒 **Secure**: Environment-based secrets, HTTP-only cookies, bcrypt password hashing

## Prerequisites

- Node.js 18+ installed
- GitHub Personal Access Token with access to MUICT-Class organization
- Access to private repositories in the organization

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
GITHUB_TOKEN=your_github_personal_access_token_here
GITHUB_ORG=MUICT-Class
JWT_SECRET=your_secret_key_change_this_in_production_min_32_chars
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme123
```

**Important**:

- Generate a GitHub Personal Access Token at https://github.com/settings/tokens
- The token needs `repo` scope to access private repositories
- Change the JWT_SECRET to a random string (minimum 32 characters)
- Update ADMIN_USERNAME and ADMIN_PASSWORD for your admin account

### 3. Run the Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

### 4. Initial Setup

On first run, the application will automatically:

- Create a `database.json` file in the project root
- Initialize the admin user with credentials from `.env`

**Default Admin Credentials** (if not changed in `.env`):

- Username: `admin`
- Password: `changeme123`

### 5. Create Your First Lab

1. Navigate to http://localhost:3000/admin/login
2. Login with admin credentials
3. Go to "Lab Management"
4. Create a new lab with:
   - Lab Number: `01` (must match repository naming)
   - Title: Your lab title (e.g., "HTML Basics")
   - File Name: `index.html` (or your target file)
   - Active: ✓ (checked)

## Usage

### For Students/Viewers

1. Visit http://localhost:3000
2. Enter your GitHub username
3. Select a lab number
4. Click "View Submission"
5. Your HTML file will be rendered in an iframe

**Repository Naming Convention**: Repositories must follow the pattern `682-lab{number}-{username}`

- Example: `682-lab01-johndoe`

### For Admins

1. Login at http://localhost:3000/admin/login
2. Access the admin dashboard
3. Manage labs:
   - Create new labs
   - Edit existing labs
   - Toggle active/inactive status
   - Delete labs

Only active labs will appear in the dropdown for students.

## Project Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── dashboard/     # Admin dashboard
│   │   ├── labs/          # Lab management interface
│   │   └── login/         # Admin login page
│   ├── api/
│   │   ├── admin/
│   │   │   ├── login/     # Authentication endpoints
│   │   │   └── logout/
│   │   ├── fetch-submission/  # Fetch GitHub files
│   │   └── labs/          # Lab CRUD operations
│   └── page.tsx           # Main submission viewer
├── components/
│   └── LogoutButton.tsx   # Reusable logout component
└── lib/
    ├── auth.ts            # JWT authentication
    ├── db.ts              # Database operations
    ├── github.ts          # GitHub API integration
    └── password.ts        # Password hashing
```

## Security Features

- ✅ JWT-based authentication with 7-day expiration
- ✅ HTTP-only cookies for token storage
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Environment-based secrets
- ✅ Sandboxed iframe for HTML rendering
- ✅ GitHub username validation
- ✅ Protected admin routes

## API Endpoints

### Public Endpoints

- `GET /api/labs?activeOnly=true` - Get active labs
- `POST /api/fetch-submission` - Fetch student submission

### Admin Endpoints (Authentication Required)

- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/labs` - Get all labs
- `POST /api/labs` - Create new lab
- `PUT /api/labs` - Update lab
- `DELETE /api/labs?id={id}` - Delete lab

## Troubleshooting

### "Repository or file not found" Error

- Verify the repository exists in the MUICT-Class organization
- Check the repository name follows the pattern: `682-lab{number}-{username}`
- Ensure your GitHub token has access to the repository
- Verify the file exists in the repository

### "Access denied" Error

- Check your GitHub token is valid
- Verify the token has `repo` scope
- Ensure the token has access to the MUICT-Class organization

### Admin Login Not Working

- Verify `.env` file exists and contains correct credentials
- Check `database.json` was created on first run
- Try deleting `database.json` and restarting to recreate the admin user

## Building for Production

```bash
npm run build
npm start
```

For deployment (e.g., Vercel):

1. Set environment variables in your deployment platform
2. Ensure `database.json` is excluded from deployment (use a production database)
3. Consider using a proper database (PostgreSQL, MongoDB) instead of lowdb

## License

This project is for educational purposes.
