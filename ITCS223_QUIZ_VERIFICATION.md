# ITCS223 Quiz Verification and Score Tracking

## Overview
This document describes the student verification, score tracking, and autosave features added to ITCS223 quizzes.

## Features Implemented

### 1. Student Verification
- **Verification Page**: Before taking a quiz, students must verify their identity
  - Location: `/itcs223/quiz/[labNumber]/verify`
  - Requires: Student ID + 6-character credential code
  - Validates against credentials database
  - Stores verification in sessionStorage

### 2. Quiz Access Control
- Quiz page checks for valid verification on load
- If not verified, automatically redirects to verification page
- Verification is lab-specific (must verify for each lab)

### 3. Autosave Functionality
- **Automatic saving**: Answers are automatically saved to localStorage when selected
- **Persistence**: Saved answers are restored when returning to quiz
- **Security**: Only works for verified quiz sessions
- **Storage key**: `quiz_answers_${labNumber}_${studentId}`
- Answers are cleared from localStorage after submission

### 4. Score Tracking
- Scores are saved to PostgreSQL database after quiz submission
- Data stored:
  - Student ID
  - Subject (ITCS223)
  - Lab number
  - Score percentage
  - Total questions
  - Correct answers
  - All answers (JSON)
  - Submission timestamp

### 5. Admin Score Viewing
- **Location**: `/admin/itcs223/quiz-scores`
- **Features**:
  - View all quiz submissions
  - Filter by lab number
  - Sort by date, score, or student ID
  - Student performance summary table
  - Overall statistics (total students, attempts, average score, highest score)
  - Export to CSV
  - Real-time refresh

## Database Schema

### quiz_scores Table
```sql
CREATE TABLE quiz_scores (
  id VARCHAR(255) PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  subject VARCHAR(20) NOT NULL,
  lab_number VARCHAR(10) NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  answers JSONB,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT quiz_scores_score_check CHECK (score >= 0 AND score <= 100)
);
```

## API Endpoints

### GET /api/quiz/scores
Get quiz scores with optional filters
- Query params:
  - `subject`: Filter by subject (e.g., ITCS223)
  - `labNumber`: Filter by lab number
  - `studentId`: Filter by student ID
- Returns: Array of quiz scores

### POST /api/quiz/scores
Save a quiz score
- Body:
  ```json
  {
    "studentId": "6788003",
    "subject": "ITCS223",
    "labNumber": "01",
    "score": 85,
    "totalQuestions": 10,
    "correctAnswers": 8,
    "answers": { "q1": "answer1", ... }
  }
  ```
- Returns: Success message with score ID

## User Flow

### Student Quiz Taking Flow
1. Click on quiz link → Redirected to verification page
2. Enter Student ID and credential code
3. System validates credentials
4. If valid → Redirected to actual quiz
5. Answer questions (answers auto-save to localStorage)
6. Submit quiz
7. Score is saved to database
8. View results
9. Session cleared (must verify again for next quiz)

### Admin Score Viewing Flow
1. Navigate to ITCS223 dashboard
2. Click "Quiz Scores" in navigation
3. View overall statistics
4. Filter/sort as needed
5. Export to CSV if required

## Security Features

- Credential validation before quiz access
- Student ID must match credential code
- Session-based verification (sessionStorage)
- Autosave only for verified sessions
- Verification cleared after submission
- All answers sanitized and validated

## Files Modified/Created

### New Files
- `/src/app/itcs223/quiz/[labNumber]/verify/page.tsx` - Verification page
- `/src/app/admin/itcs223/quiz-scores/page.tsx` - Admin score viewing
- `/src/app/api/quiz/scores/route.ts` - Quiz scores API
- `/migrations/010_add_quiz_scores_table.sql` - Database migration

### Modified Files
- `/src/app/itcs223/quiz/[labNumber]/page.tsx` - Added verification check and autosave
- `/src/app/admin/itcs223/page.tsx` - Added "Quiz Scores" navigation link
- `/src/lib/db.ts` - Added quiz score database functions
- `/database.json` - Added quizScores array (if using JSON database)

## Database Functions

### getQuizScores()
```typescript
getQuizScores(subject?: string, labNumber?: string, studentId?: string): Promise<QuizScore[]>
```

### saveQuizScore()
```typescript
saveQuizScore(
  studentId: string,
  subject: string,
  labNumber: string,
  score: number,
  totalQuestions: number,
  correctAnswers: number,
  answers: any
): Promise<QuizScore>
```

## Running Migrations

To create the quiz_scores table in your PostgreSQL database:

```bash
psql -d your_database -f migrations/010_add_quiz_scores_table.sql
```

Or use your migration tool to run migration 010.

## Configuration

No additional configuration required. The system uses existing:
- Credentials table for student verification
- PostgreSQL database for score storage
- sessionStorage for verification state
- localStorage for answer autosave

## Testing

### Test Verification
1. Use existing student credentials from credentials table
2. Try with invalid credentials (should fail)
3. Try with mismatched Student ID (should fail)

### Test Autosave
1. Start quiz after verification
2. Answer some questions
3. Close browser/refresh page
4. Return to quiz (verify again)
5. Answers should be restored

### Test Score Tracking
1. Complete and submit quiz
2. Check admin scores page
3. Verify score appears in table
4. Test filtering and sorting
5. Export CSV and verify data

## Notes

- Verification is required for EVERY quiz attempt
- Autosave only works for verified sessions
- Scores are stored permanently in database
- Students can retake quizzes (all attempts tracked)
- Admin can view all attempts with timestamps
- CSV export includes all filtered data
