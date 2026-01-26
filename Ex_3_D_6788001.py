"""
Exercise 3 Part D: Pickle Files
Author: [Your Name]
Student ID: 6788001
"""

import pickle

# Task 1: Create Student class
class Student:
    def __init__(self, name, scores):
        self.name = name
        self.scores = scores
    
    def __str__(self):
        return f"Student(name='{self.name}', scores={self.scores})"

# Task 2 & 3: Create object and save to pickle file
def save_student():
    student = Student("Alice", [85, 90, 88])
    
    with open('student.pkl', 'wb') as file:
        pickle.dump(student, file)
    
    print("Successfully saved student object to student.pkl")
    print(f"Original object: {student}")
    
    return student

# Task 4: Load object back and print
def load_student():
    with open('student.pkl', 'rb') as file:
        loaded_student = pickle.load(file)
    
    print("\nLoaded student object from student.pkl:")
    print("-" * 40)
    print(f"Name: {loaded_student.name}")
    print(f"Scores: {loaded_student.scores}")
    print(f"Object: {loaded_student}")
    
    return loaded_student

if __name__ == "__main__":
    # Execute tasks
    original = save_student()
    loaded = load_student()
    
    # Verify they are equivalent
    print("\nVerification:")
    print("-" * 40)
    print(f"Names match: {original.name == loaded.name}")
    print(f"Scores match: {original.scores == loaded.scores}")
