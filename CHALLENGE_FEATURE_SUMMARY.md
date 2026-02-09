# Challenge Enable/Disable Feature - Implementation Summary

## Overview
Implemented challenge enable/disable functionality as a built-in toggle within each lab for subjects with `lab_challenge` grading type.

## Key Changes

### 1. Database Schema
- **New Column**: `challenge_enabled` (BOOLEAN, default TRUE) added to `labs` table
- **Migration**: `migrations/015_add_challenge_enabled_to_labs.sql`
- Automatically applied on app startup via `ensureTables()` in `db.ts`

### 2. Backend Updates

#### `src/lib/db.ts`
- Updated `Lab` interface to include `challengeEnabled?: boolean`
- Added `challenge_enabled` column in `ensureTables()` function
- Updated `createLab()` to accept `challengeEnabled` parameter
- Updated `updateLab()` to handle `challengeEnabled` updates
- Added `challengeEnabled` to all Lab return objects in:
  - `getAllLabs()`
  - `getLabById()`
  - `getLabByNumber()`

#### `src/app/api/labs/route.ts`
- POST route now accepts and passes `challengeEnabled` to `createLab()`
- Removed automatic Challenge entry creation
- PUT route now **syncs Challenge entries**:
  - When Lab's `isActive` or `challengeEnabled` is updated
  - Finds corresponding Challenge entry (same labNumber, same subject, labType='Challenge')
  - Sets Challenge's `isActive = Lab.isActive AND Lab.challengeEnabled`
- DELETE route now deletes corresponding Challenge entries for all Lab entries (not just ITCS123)

### 3. Frontend Updates

#### `src/app/admin/labs/page.tsx`
- **Lab Interface**: Added `challengeEnabled?: boolean`
- **Helper Function**: `hasLabChallengeGrading()` checks if subject uses `lab_challenge` grading
- **Filtering**: Only shows Lab entries (filters out Challenge labType entries)
- **Form Updates**:
  - Added `challengeEnabled` to form state (default: true)
  - Added challenge enable checkbox (shown only for lab_challenge subjects)
  - Form submission includes `challengeEnabled` for lab_challenge subjects
- **Table Updates**:
  - Added "Challenge" column
  - Shows enable/disable toggle for lab_challenge subjects
  - Shows "N/A" for other subjects
  - Challenge toggle disabled when lab is inactive
  - Removed Challenge-specific edit/delete restrictions
- **New Handler**: `handleToggleChallenge()` to toggle challenge enabled/disabled

### 4. Score Page Updates

#### `src/app/[subject]/score/page.tsx`
- **ActiveLab Interface**: Added `challengeEnabled?: boolean` and `isActive?: boolean`
- **processRegularLab Function**:
  - Checks `challengeEnabled` flag before fetching challenge scores
  - Sets `challengeScore = '-'` when challenge is disabled or lab is inactive
  - Only fetches challenge score data when `challengeEnabled !== false && isActive !== false`
- **Max Score Calculation**:
  - `maxChallengeScore` now only counts labs where `challengeEnabled !== false && isActive !== false`
  - Formula: `enabledChallengesCount × 2 points`
- **Total Score Calculation**:
  - `totalCh` calculation skips rows with `challengeScore === '-'`
  - Disabled challenges don't contribute to the total
- **Display Updates**:
  - Challenge column shows "-" for disabled challenges (gray color)
  - Challenge column shows colored badges (0/1/2) for enabled challenges
  - "Total Challenge Score (Max X)" reflects only enabled challenges

### 5. Caching Fix
Updated `vercel.json` to exclude `/api/users` and `/api/subjects` from caching:
```json
{
  "source": "/api/users",
  "headers": [{"key": "Cache-Control", "value": "no-store, no-cache, must-revalidate"}]
},
{

## Challenge Entry Synchronization

The system maintains backwards compatibility with existing Challenge entries (labType='Challenge') while using the new `challengeEnabled` flag:

### Sync Logic:
1. **Lab Update**: When a Lab's `isActive` or `challengeEnabled` is updated, the corresponding Challenge entry (if exists) is automatically synced:
   - Challenge.isActive = Lab.isActive AND Lab.challengeEnabled
   
2. **Lab Deletion**: When a Lab is deleted, its corresponding Challenge entry is also deleted

3. **Grading Component**: `LabChallengeGrading.tsx` now checks `lab.challengeEnabled && lab.isActive` instead of looking for separate Challenge entries

### Backwards Compatibility:
- Existing Challenge entries remain in the database
- Test cases on Challenge entries continue to work
- TestManagementPage continues to filter by labType for test case management
- The lab management UI hides Challenge entries (shows only Lab entries)
  "source": "/api/subjects",
  "headers": [{"key": "Cache-Control", "value": "no-store, no-cache, must-revalidate"}]
}
```

## User Experience

### For Lab Management:
1. **Creating Labs**: 
   - For subjects with lab_challenge grading type, a checkbox appears: "Enable Challenge Mode (Default: Enabled)"
   - Challenge is enabled by default
   
2. **Lab Table**:
   - New "Challenge" column shows enable/disable statusremain in the database for backwards compatibility:
   - They're hidden in the lab management UI
   - They're automatically synced when the corresponding Lab is updated
   - They contain test cases for challenge modes
   - They're used by TestManagementPage for test case filtering
   - Only visible for subjects with lab_challenge grading type
   - Toggle button changes between "Enabled" (purple) and "Disabled" (gray)
   - Challenge toggle is disabled when lab is inactive
   
3. **Lab Visibility**:
   - Only Lab entries are shown (Challenge labType entries are filtered out)
   - Challenge functionality is built into each lab

### Business Logic:
- When a lab is **active** and **challenge is enabled** → Challenge mode is available to students
- When a lab is **active** but **challenge is disabled** → Only lab mode available
- When a lab is **inactive** → Neither lab nor challenge modes are available (challenge toggle is disabled)

## Migration Path
For existing installations:
1. The migration runs automatically on app startup
2. Existing labs in lab_challenge subjects will have `challenge_enabled = TRUE` by default
3. Separate Challenge entries (with `labType='Challenge'`) are now hidden in the UI but remain in the database for backwards compatibility

## Testing Checklist
- [ ] Create new lab in lab_challenge subject (e.g., ITCS123, ITCS223)
- [ ] Verify challenge toggle appears in form and table
- [ ] Toggle challenge enable/disable and verify database update
- [ ] Verify challenge toggle is disabled when lab is inactive
- [ ] Create lab in non-lab_challenge subject and verify no challenge toggle
- [ ] Edit existing lab and verify challengeEnabled value is preserved
- [ ] Verify only Lab entries are shown (no Challenge entries)
- [ ] **Score Page Tests**:
  - [ ] View score page for lab_challenge subject
  - [ ] Verify disabled challenge shows "-" instead of score
  - [ ] Verify max challenge score only counts enabled challenges
  - [ ] Verify total challenge score excludes disabled challenges
  - [ ] Toggle challenge on/off and verify score page updates correctly

## API Endpoints
- `GET /api/labs` - Returns labs with `challengeEnabled` field
- `POST /api/labs` - Accepts `challengeEnabled` in request body
- `PUT /api/labs` - Accepts `challengeEnabled` in request body for updates
