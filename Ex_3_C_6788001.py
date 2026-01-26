"""
Exercise 3 Part C: JSON Files
Author: [Your Name]
Student ID: 6788001
"""

import json

# Task 1: Create JSON file with student data
def create_students_json():
    data = {
        "students": [
            {"id": 1, "name": "Alice", "score": 85},
            {"id": 2, "name": "Bob", "score": 90}
        ]
    }
    
    with open('students.json', 'w') as file:
        json.dump(data, file, indent=2)
    
    print("Successfully created students.json")

# Task 2: Read JSON file
def read_students_json():
    with open('students.json', 'r') as file:
        data = json.load(file)
    
    print("\nJSON data loaded:")
    print("-" * 40)
    print(json.dumps(data, indent=2))
    
    return data

# Task 3: Print student names only
def print_student_names(data):
    print("\nStudent names only:")
    print("-" * 40)
    for student in data['students']:
        print(student['name'])

if __name__ == "__main__":
    # Execute tasks
    create_students_json()
    data = read_students_json()
    print_student_names(data)
