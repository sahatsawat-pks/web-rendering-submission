# ITCS255 SQL Testing System Guide

## Overview

The ITCS255 SQL testing system supports comprehensive testing of MySQL/SQL code for DDL (Data Definition Language), DML (Data Manipulation Language), and DQL (Data Query Language) operations.

## Features

### 1. **Database Starter**
Lab-level SQL initialization that runs once before all tests. Use this for:
- Creating databases (`CREATE DATABASE pokemon_db`)
- Creating tables with constraints
- Setting up initial schema structure

### 2. **Test Case Components**

Each test case can include:

#### **Setup SQL** (Optional)
Pre-test data preparation that runs before each test:
```sql
INSERT INTO trainers (name, badge_count) VALUES ('Ash', 8);
INSERT INTO pokemon (name, type, trainer_id) VALUES ('Pikachu', 'Electric', 1);
```

#### **Test Input** (Required)
The main SQL query to test - typically the student's code:
```sql
SELECT t.name AS trainer_name, COUNT(p.id) AS pokemon_count
FROM trainers t
LEFT JOIN pokemon p ON t.id = p.trainer_id
GROUP BY t.id, t.name;
```

#### **Verification SQL** (Optional)
Query to verify the result (useful for DML operations):
```sql
SELECT name, type FROM pokemon WHERE trainer_id = 1;
```

#### **Expected Output** (Required)
The expected result for comparison

#### **Cleanup SQL** (Optional)
Cleanup operations after each test:
```sql
DELETE FROM pokemon WHERE trainer_id = 1;
DELETE FROM trainers WHERE id = 1;
```

### 3. **Test Types**

#### **query_result** (Default)
- Tests SELECT queries
- Compares actual query output with expected results
- Format: `column1|column2|column3`

#### **data_check**
- Tests INSERT, UPDATE, DELETE operations
- Uses verification SQL to check if data changed correctly
- Shows affected row count or verification query results

#### **structure_check**
- Tests CREATE, ALTER, DROP operations
- Uses verification SQL to check table/database structure
- Can verify column definitions, constraints, indexes

### 4. **Special Features**

#### **Should Fail Flag**
Mark tests that should produce errors:
- Constraint violations
- Invalid syntax tests
- Permission errors
- Test passes if expected error occurs

#### **Match Mode**
- **trim**: Ignores extra whitespace (default)
- **exact**: Requires exact character-by-character match

## Example Test Cases

### Example 1: DDL - Create Table with Constraints
```json
{
  "name": "Create Trainers Table",
  "testType": "structure_check",
  "input": "CREATE TABLE trainers (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(50) NOT NULL, badge_count INT DEFAULT 0);",
  "verificationSql": "SHOW CREATE TABLE trainers;",
  "expectedOutput": "Table structure created",
  "matchMode": "trim"
}
```

### Example 2: DML - Insert with Constraint Violation
```json
{
  "name": "Insert Duplicate Primary Key",
  "testType": "data_check",
  "setupSql": "INSERT INTO trainers (id, name) VALUES (1, 'Ash');",
  "input": "INSERT INTO trainers (id, name) VALUES (1, 'Gary');",
  "shouldFail": true,
  "expectedOutput": "Duplicate entry",
  "cleanupSql": "DELETE FROM trainers WHERE id = 1;"
}
```

### Example 3: DQL - JOIN Query
```json
{
  "name": "List Trainers with Pokemon Count",
  "testType": "query_result",
  "setupSql": "INSERT INTO trainers (name) VALUES ('Ash'), ('Gary');\nINSERT INTO pokemon (name, trainer_id) VALUES ('Pikachu', 1), ('Charizard', 1), ('Blastoise', 2);",
  "input": "SELECT t.name, COUNT(p.id) as count FROM trainers t LEFT JOIN pokemon p ON t.id = p.trainer_id GROUP BY t.id;",
  "expectedOutput": "Ash|2\nGary|1",
  "matchMode": "trim",
  "cleanupSql": "DELETE FROM pokemon; DELETE FROM trainers;"
}
```

### Example 4: DML - UPDATE with Verification
```json
{
  "name": "Update Pokemon Type",
  "testType": "data_check",
  "setupSql": "INSERT INTO pokemon (name, type) VALUES ('Pikachu', 'Electric');",
  "input": "UPDATE pokemon SET type = 'Electric/Steel' WHERE name = 'Pikachu';",
  "verificationSql": "SELECT name, type FROM pokemon WHERE name = 'Pikachu';",
  "expectedOutput": "Pikachu|Electric/Steel",
  "cleanupSql": "DELETE FROM pokemon WHERE name = 'Pikachu';"
}
```

### Example 5: DML - DELETE with CASCADE
```json
{
  "name": "Delete Trainer with CASCADE",
  "testType": "data_check",
  "setupSql": "INSERT INTO trainers (id, name) VALUES (1, 'Ash');\nINSERT INTO pokemon (name, trainer_id) VALUES ('Pikachu', 1);",
  "input": "DELETE FROM trainers WHERE id = 1;",
  "verificationSql": "SELECT COUNT(*) as count FROM pokemon WHERE trainer_id = 1;",
  "expectedOutput": "0",
  "matchMode": "trim"
}
```

## Creating Tests in the Admin Interface

1. **Navigate to Admin Panel**
   - Go to `/admin/itcs255/tests`
   - Login as lecturer or admin

2. **Configure Lab Settings**
   - Set Total Score for gradient display
   - Add Database Starter SQL if needed

3. **Create Test Cases**
   - Click "Add Test" button
   - Fill in test details:
     - Test Name (descriptive)
     - Test Type (query_result/data_check/structure_check)
     - Test Input (main SQL query)
     - Setup SQL (if needed)
     - Verification SQL (if needed)
     - Expected Output
     - Should Fail checkbox (for error tests)
     - Match Mode (trim/exact)
     - Cleanup SQL (if needed)

4. **Save and Activate**
   - Save test cases
   - Ensure lab is active for students

## Testing Flow

### For Students (Rendering Page)

1. **Select Lab**
   - Choose lab from dropdown

2. **Write SQL Code**
   - Write query in the editor

3. **Run Tests**
   - Click "Run Tests" button
   - System executes:
     1. Database Starter (once)
     2. For each test:
        - Setup SQL
        - Test Input (student's code)
        - Verification SQL
        - Comparison with expected output
        - Cleanup SQL

4. **Review Results**
   - Green: Passed
   - Red: Failed
   - Expand test to see details

### Execution Order

```
1. Database Starter (Lab level, runs once)
   ↓
2. For each test case:
   a. Setup SQL (test-specific data)
   b. Test Input (student's query)
   c. Verification SQL (check results)
   d. Compare output
   e. Cleanup SQL (reset for next test)
```

## Best Practices

### Database Starter
- Create minimal schema needed for all tests
- Include primary/foreign key constraints
- Keep it focused on structure, not data

### Setup SQL
- Insert only data needed for specific test
- Use predictable IDs/values
- Keep data minimal

### Test Input
- Test one concept per test case
- Use clear, descriptive test names
- Group related tests by sub-question

### Verification SQL
- Use for DML operations (INSERT/UPDATE/DELETE)
- Check actual data changes, not just row counts
- Keep queries simple and focused

### Expected Output
- Use consistent formatting
- One row per line
- Columns separated by `|`
- Use trim mode for flexibility

### Cleanup SQL
- Always clean up test data
- Delete in reverse order (child → parent)
- Use transactions for complex cleanup

## Output Formats

### Query Results (query_result)
```
column1|column2|column3
value1|value2|value3
value4|value5|value6
```

### Data Check (data_check)
```
Affected rows: 2
```
Or verification query results:
```
name|type
Pikachu|Electric
```

### Structure Check (structure_check)
```json
{
  "table_name": "trainers",
  "columns": [...]
}
```
Or simple:
```
Structure verified
```

## Troubleshooting

### Test Fails with Timeout
- Query is too complex or infinite loop
- Check for missing WHERE clauses
- Optimize query performance

### "No rows returned" when expecting results
- Setup SQL not inserting data correctly
- Check primary key conflicts
- Verify foreign key constraints

### Cleanup not working
- Delete in wrong order (parent before child)
- Foreign key constraints preventing delete
- Use CASCADE or delete children first

### Expected output doesn't match
- Check for extra whitespace
- Use trim mode
- Verify column order in SELECT
- Check for NULL vs empty string

## Security Considerations

- Each test runs in isolated transaction
- Database starter creates temporary structures
- Cleanup SQL ensures test isolation
- Timeout limits prevent infinite loops
- SQL injection protection in API layer

## Environment Variables

```env
DATABASE_URL_TEST=postgresql://user:pass@localhost:5432/test_db
DATABASE_URL=postgresql://user:pass@localhost:5432/main_db
```

Use `DATABASE_URL_TEST` for SQL test execution to isolate from main database.
