# Web Rendering & Grading System

A comprehensive Next.js application for managing student lab submissions, grading, quizzes, and academic performance tracking. Supports multiple subject management, role-based access control, and advanced grading methodologies.

## 🎯 Overview

This system provides a complete academic management platform with:
- **Student Portal**: View submissions, grades, quizzes, and feedback
- **Admin Dashboard**: Manage subjects, labs, students, and grading
- **Flexible Grading System**: Support for multiple grading types and methodologies
- **Quiz Management**: Create and manage quizzes with scoring
- **Real-time Feedback**: Instructor-to-student feedback system
- **Multi-Role Support**: Students, Lecturers, and Main Admins with different permissions

---

## ✨ Key Features

### 📚 Subject Management
- Create and manage multiple subjects/courses
- Customize subject branding (colors, icons, descriptions)
- Control subject visibility and display order
- Enable/disable features per subject (quizzes, feedback sections, etc.)
- Support for different course codes and academic parameters

### 🧪 Lab Management
- Create lab assignments with configurable properties
- Support for multiple lab types:
  - **Standard Labs**: Basic scoring (0, 1, or 2 points)
  - **Challenge Labs**: Additional challenge components
  - **SQL Labs**: SQL query grading with test cases
  - **Python Labs**: Python code grading with test execution
  - **Multi-Question Labs**: Multiple question types per lab
  - **Criteria-Based Labs**: Grading based on specific criteria
- Quiz integration per lab
- Challenge enable/disable per lab
- Lab weights in subject grading
- Test case management for SQL and Python labs
- In-class tracking and performance notes

### 📊 Grading System
- **Multiple Grading Methods**:
  - Simple Score Grading (uniform 0/1/2 or variable scoring)
  - Lab & Challenge Split Grading
  - Criteria-Based Grading (Ethics, Understanding, Reflection, etc.)
  - Python Lab Grading (Test cases + In-class)
  - SQL Lab Grading (Comparison tools + Test verification)
  - Multi-Question Lab Grading
  
- **Advanced Features**:
  - Quick Feedback Section (all grading methods)
  - Feedback creator attribution
  - Real-time feedback visibility control
  - Student feedback history
  - Bulk scoring operations
  - Fill missing scores with default value
  - Uniform lab scoring option across subjects

### ❓ Quiz System
- Quiz creation and management
- Question types support
- Rich text editor for questions (TipTap integration)
- Per-lab quiz configuration
- Quiz scoring and progress tracking
- Quiz results visibility per student
- Quiz history and analytics
- Question bank management

### 📈 Student Performance Tracking
- Comprehensive score sheets with lab and challenge breakdowns
- Per-student feedback viewing
- Score history and trends
- Quiz performance metrics
- Downloadable report exports (CSV, Excel)
- Filter and search capabilities
- Column selection and customization
- Real-time data synchronization

### 💬 Feedback System
- Quick feedback creation for any student/lab
- Feedback visibility control (visible to student or admin-only)
- Creator attribution with username tracking
- Tooltip display of feedback with metadata
- Smart tooltip positioning (auto-flip above/below to avoid overlap)
- Delete feedback capability
- Database-backed feedback storage
- No-cache API responses for real-time updates

### 👥 User Management
- Student roster management
- Role-based access control (Student, LA, Lecturer, Main Admin)
- User credentials management
- Email integration for student notifications
- Bulk user import from CSV
- Department-based student organization

### 🔐 Authentication & Security
- JWT-based authentication
- HTTP-only secure cookies
- Bcrypt password hashing
- Role-based route protection
- Credential lookup system
- Secure API endpoints
- Environment-based configuration

### 🎨 UI/UX Features
- Dark mode support (next-themes)
- Responsive design (mobile, tablet, desktop)
- Glass-card design system with gradients
- Animated transitions and micro-interactions
- Real-time data updates
- Toast notifications
- Modal dialogs for confirmations
- Loading states and spinners
- Search and filter interfaces
- Drag-and-drop for sorting (labs, subjects)
- Rich text editing (TipTap)
- Data export functionality

### 📊 Analytics & Reporting
- Subject performance dashboard
- Grade distribution analysis
- Student progress tracking
- Feedback response metrics
- Exportable reports (Excel, CSV)
- Statistical summaries
- Historical performance data

### 🧬 Advanced Features
- Test case execution (Python, SQL)
- Code rendering and display
- HTML/CSS submission viewing
- GitHub integration for submission fetching
- Azure Microsoft Graph integration
- Google Sheets API integration
- Database connection pooling (Neon PostgreSQL)
- Migration support for data schema updates
- Search and pagination across large datasets

---

## 🛠 Technology Stack

### Frontend
- **React 19**: UI library
- **Next.js 16.1.1**: Framework with App Router
- **TailwindCSS**: Utility-first CSS
- **Radix UI**: Accessible component primitives
- **Shadcn**: Component library
- **TipTap**: Rich text editor
- **Lucide React**: Icon system
- **next-themes**: Dark mode management

### Backend
- **Next.js API Routes**: Serverless functions
- **PostgreSQL (Neon)**: Primary database
- **Lowdb**: Local JSON database (fallback)
- **Node.js**: Runtime

### Authentication & Security
- **Jose**: JWT token management
- **Bcrypt**: Password hashing (10 rounds)
- **DOMPurify**: XSS protection

### Integrations
- **GitHub API** (@octokit/rest): Repository access
- **Microsoft Graph**: Azure AD integration
- **Google API**: Sheets integration
- **Vercel Analytics**: Performance monitoring

### Build & Deployment
- **Vercel**: Hosting platform
- **Turbopack**: Build system
- **ESLint**: Code linting

---

## 👤 User Roles & Permissions

### 🧑‍🎓 Student
**Access**: `/[subject]/...` (Subject Pages)
- View own lab submissions and scores
- Submit quizzes and view results
- View feedback from instructors
- Track performance and grades
- Download personal reports
- View quiz history

### 👨‍🏫 LA / Lecturer
**Access**: `/admin/[subject]/...` (Admin Dashboard)
- View all student scores
- Create and edit labs
- Grade student submissions (multiple grading methods)
- Add feedback to student labs
- Manage quizzes and questions
- Export and analyze grade data
- View and respond to student work
- Filter and search student records
- Modify lab properties and settings

### 🔑 Main Admin
**Access**: `/admin/...` (Full Admin Panel)
- **Everything Lecturers can do, plus**:
- Create and manage subjects
- Manage user roles and permissions
- User credentials administration
- System-wide settings and configuration
- Subject visibility and display order
- Lab weight configuration
- Feature enable/disable per subject
- Database administration
- System health monitoring

---

## 📱 Student Features

### Subject Selection
- Browse available subjects with custom branding
- View subject descriptions and metadata
- Navigate to subject-specific pages

### Lab Viewing & Submission
- View assigned labs and deadlines
- Access lab descriptions and requirements
- Submit lab work (if applicable)
- Track submission status

### Score Tracking (`/[subject]/score`)
- View comprehensive grade sheets
- See lab and challenge breakdowns
- Review individual cell scores
- View feedback on specific labs
- Column filtering and search
- Export grade data
- Real-time score updates

### Quiz System (`/[subject]/quiz`)
- Take available quizzes
- View quiz questions
- Submit quiz responses
- Track quiz scores
- Review quiz history
- View feedback on quiz performance

### Test Cases (`/[subject]/test-case`)
- View test case requirements
- Test code submissions
- See test execution results
- Get immediate feedback

### Submission Rendering (`/[subject]/rendering`)
- View rendered HTML submissions
- See code syntax highlighting
- Access submission files

---

## 🎓 Admin/Lecturer Features

### Dashboard (`/admin/[subject]`)
- Subject overview and statistics
- Quick access to all admin functions
- Grade summary and trends
- Recent activity feed

### Student Score Management (`/admin/[subject]/student-score`)
- Comprehensive student score table
- Multiple column types (Lab, Challenge, Quiz, Total)
- Cell-level feedback with tooltip display
- Creator attribution in feedback (hover to see "Added by: username")
- Smart tooltip positioning (auto-switches below if insufficient space above)
- Feedback delete functionality
- Score filtering and search
- Batch operations (fill missing scores)
- Data export (Excel, CSV)
- Real-time sorting and pagination

### Lab Management (`/admin/labs`)
- View all labs across subjects
- Create new labs with properties:
  - Lab number and title
  - Active/inactive status
  - Quiz enable/disable
  - Challenge enable/disable
  - Max score configuration
  - Lab weight for grading
  - Test case configuration
  - Database starter scripts
- Edit existing labs
- Delete labs
- Reorder labs via drag-and-drop
- Search and filter labs
- Bulk operations

### Grading Interface (`/admin/[subject]`)
- Multiple grading type support:
  - **Simple Score Grading**: Basic 0/1/2 or custom scoring
  - **Lab Challenge Grading**: Separate lab and challenge scores
  - **Criteria Grading**: Multi-criteria assessment (Ethics, Understanding, Reflection)
  - **Python Grading**: With test case execution and in-class tracking
  - **SQL Grading**: With test verification and query comparison
  - **Multi-Question Grading**: Multiple question types
  
- Each grading type includes:
  - Student Lab Grader section
  - Labs list with quiz indicators
  - Quick Feedback Section
  - Announcements for communication
  - Success notifications

### Quiz Management (`/admin/quiz-management`)
- Create and edit quizzes
- Add questions with rich text formatting
- Configure quiz settings
- Assign quizzes to labs
- View quiz analytics
- Export quiz data

### Quiz Scores (`/admin/[subject]/quiz-scores`)
- View student quiz performance
- Score breakdowns by question
- Quiz completion status
- Student feedback on quiz performance

### Subject Management (`/admin/subjects`)
- Create new subjects
- Edit subject properties:
  - Subject code and title
  - Branding (color gradients, icons)
  - Description and metadata
  - Display order
  - Visibility (student-facing)
  - Feature toggles (feedback section, quizzes)
  - Lab weight configuration
- Delete subjects
- Bulk subject operations
- Subject icon and color selection
- Shadow styling customization

### User Management (`/admin/users`)
- View and manage user accounts
- Assign roles (Student, LA, Lecturer, Main Admin)
- Edit user information
- Manage user credentials
- View user activity

### Credentials & Lookup (`/admin/credentials`, `/admin/lookup-credential`)
- Manage student credentials
- Create universal credentials
- Bulk import credentials
- Search and lookup credentials
- Credential validation

---

## 🏗 Project Structure

```
src/
├── app/
│   ├── [subject]/                    # Student portal pages
│   │   ├── page.tsx                 # Subject overview
│   │   ├── score/                   # Score viewing
│   │   ├── quiz/                    # Quiz interface
│   │   ├── test-case/               # Test execution
│   │   └── rendering/               # Submission rendering
│   │
│   ├── admin/                        # Admin dashboard
│   │   ├── login/                   # Admin authentication
│   │   ├── dashboard/               # Main admin hub
│   │   ├── [subject]/               # Subject-specific admin
│   │   │   ├── page.tsx             # Grading interface (multiple types)
│   │   │   ├── student-score/       # Score management
│   │   │   ├── quiz/                # Quiz management
│   │   │   ├── quiz-scores/         # Quiz analytics
│   │   │   └── tests/               # Test case management
│   │   ├── subjects/                # Subject management
│   │   ├── labs/                    # Lab management
│   │   ├── quiz-management/         # Quiz creation/editing
│   │   ├── users/                   # User management
│   │   ├── credentials/             # Credential management
│   │   └── lookup-credential/       # Credential lookup
│   │
│   ├── api/                          # API routes
│   │   ├── feedback/                # Feedback CRUD
│   │   ├── labs/                    # Lab operations
│   │   ├── subjects/                # Subject operations
│   │   ├── users/                   # User operations
│   │   ├── quizzes/                 # Quiz operations
│   │   ├── scores/                  # Score retrieval
│   │   └── [various]/               # Other API endpoints
│   │
│   ├── globals.css                  # Global styles
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Landing page
│   └── not-found.tsx
│
├── components/                       # Reusable components
│   ├── admin/                       # Admin-specific components
│   │   ├── LabChallengeGrading.tsx
│   │   ├── SimpleScoreGrading.tsx
│   │   ├── CriteriaGrading.tsx
│   │   ├── PythonGrading.tsx
│   │   ├── SQLGrading.tsx
│   │   ├── MultiQuestionGrading.tsx
│   │   ├── QuickFeedbackSection.tsx # Feedback form
│   │   ├── FeedbackModal.tsx        # Feedback editor
│   │   └── [various]/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── RichTextEditor.tsx
│   ├── mode-toggle.tsx
│   └── [various]/
│
├── lib/                              # Utility functions & helpers
│   ├── db.ts                        # Database operations
│   ├── auth.ts                      # Authentication utilities
│   ├── colors.ts                    # Color utilities
│   ├── subjectConfigAdapter.ts      # Subject config mapping
│   ├── iconMap.ts                   # Icon management
│   └── [various]/
│
├── migrations/                       # Database migrations
│   ├── 004_add_subjects_table.sql
│   ├── 005_add_sub_questions_to_labs.sql
│   ├── 010_add_quiz_scores_table.sql
│   ├── 011_add_lab_weight_to_subjects.sql
│   ├── 015_add_challenge_enabled_to_labs.sql
│   ├── 016_add_use_uniform_lab_score.sql
│   └── [various]/
│
└── scripts/                          # Utility scripts
    ├── migrate_credentials.js
    ├── setup_uniform_scoring.js
    └── [various]/
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (Neon) or SQLite fallback
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd web-rendering-submission
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Database
DATABASE_URL=postgresql://user:password@host/dbname

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# Integrations
GITHUB_TOKEN=your_github_token
AZURE_TENANT_ID=your_azure_tenant
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_secret
GOOGLE_API_KEY=your_google_api_key

# Application
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

4. **Run database migrations**
```bash
npm run migrate
```

5. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000`

### Production Build
```bash
npm run build
npm start
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout

### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create subject
- `PUT /api/subjects` - Update subject
- `DELETE /api/subjects` - Delete subject
- `POST /api/subjects/toggle-quiz-section` - Toggle quiz feature

### Labs
- `GET /api/labs` - Get labs (supports filtering)
- `POST /api/labs` - Create lab
- `PUT /api/labs` - Update lab
- `DELETE /api/labs` - Delete lab

### Scores
- `GET /api/scores` - Get student scores
- `POST /api/scores` - Save scores
- `GET /api/quiz/scores` - Get quiz scores

### Feedback
- `GET /api/feedback` - Get feedback (query: labNumber, subject, studentId, visibleOnly)
- `POST /api/feedback` - Create/update feedback
- `DELETE /api/feedback` - Delete feedback

### Quizzes
- `GET /api/quizzes` - Get quizzes
- `POST /api/quizzes` - Create quiz
- `PUT /api/quizzes` - Update quiz
- `DELETE /api/quizzes` - Delete quiz

### Users
- `GET /api/users` - Get users
- `POST /api/users` - Create user
- `PUT /api/users` - Update user
- `DELETE /api/users` - Delete user

### Test Execution
- `POST /api/run-python` - Execute Python code
- `POST /api/run-sql` - Execute SQL queries
- `POST /api/test-runner` - Run test cases

---

## 🎨 Grading Types Explained

### Simple Score Grading
Basic point-based grading with individual score entry per student.
- Supports uniform scoring (0/1/2 across all labs)
- Variable scoring per lab
- Lab weights configuration
- Perfect for straightforward assessment

### Lab Challenge Grading
Separate scoring for base lab and additional challenges.
- Lab component score
- Challenge component score
- Combined total calculation
- Ideal for labs with bonus/extra credit

### Criteria-Based Grading
Multi-dimensional assessment based on specific criteria.
- Example criteria: Ethics, Understanding, Reflection, Presentation, etc.
- Each criterion scored independently
- Customizable criteria per subject
- Comprehensive skill evaluation

### Python Grading
Specialized for Python code assessment.
- Test case execution and validation
- In-class tracking and notes
- Code quality assessment
- Automatic test failure detection
- Real-time feedback

### SQL Grading
Specialized for SQL query assessment.
- Query execution and verification
- Comparison with expected results
- Test case management
- SQL syntax validation
- Query performance tracking

### Multi-Question Grading
Multiple question types in single lab.
- Support for various question formats
- Individual question scoring
- Aggregated lab score
- Detailed answer review

---

## 🔍 Database Schema

Key tables:
- `subjects` - Course/subject definitions
- `labs` - Lab assignment definitions
- `quiz_scores` - Student quiz performance
- `lab_feedback` - Feedback comments and metadata
- `students` - Student roster
- `users` - System user accounts
- `subject_features` - Feature configuration per subject
- `quizzes` - Quiz definitions
- `quiz_questions` - Quiz question content
- `test_cases` - SQL/Python test definitions

---

## 🔐 Security Measures

✅ JWT-based authentication with 7-day expiration
✅ HTTP-only secure cookies
✅ Bcrypt password hashing (10 rounds)
✅ CORS protection
✅ XSS protection (DOMPurify)
✅ SQL injection prevention (parameterized queries)
✅ Role-based access control (RBAC)
✅ Environment-based secrets management
✅ Rate limiting on sensitive endpoints
✅ HTTPS enforcement in production

---

## 📊 Key Features by Page

| Page | Role | Features |
|------|------|----------|
| `/` | All | Subject selection, landing |
| `/[subject]/score` | Student | View own grades |
| `/[subject]/quiz` | Student | Take quizzes |
| `/[subject]/test-case` | Student | Run code tests |
| `/admin/[subject]` | Lecturer+ | Grading interface |
| `/admin/[subject]/student-score` | Lecturer+ | Grade management, feedback |
| `/admin/subjects` | Main Admin | Subject management |
| `/admin/labs` | Lecturer+ | Lab management |
| `/admin/quiz-management` | Lecturer+ | Quiz creation |
| `/admin/users` | Main Admin | User management |

---

## 🚀 Deployment

### Vercel
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📝 License

Educational use only. MUICT Class Management System.

---

## 🤝 Contributing

For bug reports and feature requests, please use the GitHub issue tracker.

---

## 📞 Support

For technical support and questions, contact the development team.
