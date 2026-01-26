"""
Exercise 3 Part B: CSV Files
Author: [Your Name]
Student ID: 6788001
"""

import csv

# Task 1 & 2: Create CSV file with data
def create_students_csv():
    students_data = [
        ['id', 'name', 'score'],
        ['1', 'Alice', '85'],
        ['2', 'Bob', '90'],
        ['3', 'Charlie', '70']
    ]
    
    with open('students.csv', 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(students_data)
    
    print("Successfully created students.csv")

# Task 3.1: Read CSV and convert to 2D list
def read_csv_to_list():
    students_list = []
    with open('students.csv', 'r') as file:
        reader = csv.reader(file)
        for row in reader:
            students_list.append(row)
    
    print("\nCSV as 2D list:")
    print("-" * 40)
    for row in students_list:
        print(row)
    
    return students_list

# Task 3.2: Print students with score >= 80
def print_high_scorers():
    print("\nStudents with score >= 80:")
    print("-" * 40)
    
    with open('students.csv', 'r') as file:
        reader = csv.DictReader(file)
        for student in reader:
            if int(student['score']) >= 80:
                print(f"ID: {student['id']}, Name: {student['name']}, Score: {student['score']}")

if __name__ == "__main__":
    # Execute tasks
    create_students_csv()
    students_list = read_csv_to_list()
    print_high_scorers()
