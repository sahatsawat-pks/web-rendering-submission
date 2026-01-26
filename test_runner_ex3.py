"""
Test Runner for Exercise 3: File Handling & Serialization
This is an optional test runner to validate file I/O operations

Usage:
    python3 test_runner_ex3.py <student_id>
    
Example:
    python3 test_runner_ex3.py 6788001
"""

import os
import sys
import csv
import json
import pickle
import importlib.util
from typing import Dict, List, Tuple

class TestRunner:
    def __init__(self, student_id: str):
        self.student_id = student_id
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log(self, message: str, success: bool = True):
        """Log test results"""
        symbol = "✓" if success else "✗"
        status = "PASS" if success else "FAIL"
        print(f"{symbol} [{status}] {message}")
        self.total_tests += 1
        if success:
            self.passed_tests += 1
    
    def test_part_a(self) -> bool:
        """Test Part A: Basic File I/O"""
        print("\n" + "="*60)
        print("Testing Part A: Basic File I/O")
        print("="*60)
        
        script_name = f"Ex_3_A_{self.student_id}.py"
        
        try:
            # Check if script exists
            if not os.path.exists(script_name):
                self.log(f"Script {script_name} not found", False)
                return False
            self.log(f"Found script {script_name}")
            
            # Import and run the module
            spec = importlib.util.spec_from_file_location("part_a", script_name)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Check if note.txt exists
            if not os.path.exists('note.txt'):
                self.log("note.txt not found", False)
                return False
            self.log("note.txt exists")
            
            # Read and validate note.txt
            with open('note.txt', 'r') as f:
                lines = f.readlines()
            
            if len(lines) >= 3:
                self.log(f"note.txt has {len(lines)} lines (expected at least 3)")
                
                # Check for ITCS251
                has_itcs251 = any("ITCS251" in line for line in lines)
                self.log("Found 'ITCS251' in note.txt", has_itcs251)
                
                # Check for @ symbol (email pattern)
                has_email = any("@" in line for line in lines)
                self.log("Found email pattern in note.txt", has_email)
                
                return has_itcs251 and has_email
            else:
                self.log(f"note.txt has only {len(lines)} lines (expected at least 3)", False)
                return False
                
        except Exception as e:
            self.log(f"Error in Part A: {str(e)}", False)
            return False
    
    def test_part_b(self) -> bool:
        """Test Part B: CSV Files"""
        print("\n" + "="*60)
        print("Testing Part B: CSV Files")
        print("="*60)
        
        script_name = f"Ex_3_B_{self.student_id}.py"
        
        try:
            # Check if script exists
            if not os.path.exists(script_name):
                self.log(f"Script {script_name} not found", False)
                return False
            self.log(f"Found script {script_name}")
            
            # Import and run the module
            spec = importlib.util.spec_from_file_location("part_b", script_name)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Check if students.csv exists
            if not os.path.exists('students.csv'):
                self.log("students.csv not found", False)
                return False
            self.log("students.csv exists")
            
            # Read and validate students.csv
            with open('students.csv', 'r') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            
            # Check for required columns
            if len(rows) > 0:
                required_cols = {'id', 'name', 'score'}
                actual_cols = set(rows[0].keys())
                
                if required_cols.issubset(actual_cols):
                    self.log("CSV has required columns: id, name, score")
                else:
                    self.log(f"CSV missing columns. Expected: {required_cols}, Got: {actual_cols}", False)
                    return False
            
            # Check for expected data
            expected_names = {'Alice', 'Bob', 'Charlie'}
            actual_names = {row['name'] for row in rows}
            
            if expected_names == actual_names:
                self.log("CSV has all expected student names")
            else:
                self.log(f"CSV names mismatch. Expected: {expected_names}, Got: {actual_names}", False)
                return False
            
            # Check for high scorers (score >= 80)
            high_scorers = [row for row in rows if int(row['score']) >= 80]
            if len(high_scorers) >= 2:
                self.log(f"Found {len(high_scorers)} students with score >= 80")
            else:
                self.log(f"Expected at least 2 students with score >= 80, found {len(high_scorers)}", False)
                return False
            
            return True
            
        except Exception as e:
            self.log(f"Error in Part B: {str(e)}", False)
            return False
    
    def test_part_c(self) -> bool:
        """Test Part C: JSON Files"""
        print("\n" + "="*60)
        print("Testing Part C: JSON Files")
        print("="*60)
        
        script_name = f"Ex_3_C_{self.student_id}.py"
        
        try:
            # Check if script exists
            if not os.path.exists(script_name):
                self.log(f"Script {script_name} not found", False)
                return False
            self.log(f"Found script {script_name}")
            
            # Import and run the module
            spec = importlib.util.spec_from_file_location("part_c", script_name)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Check if students.json exists
            if not os.path.exists('students.json'):
                self.log("students.json not found", False)
                return False
            self.log("students.json exists")
            
            # Read and validate students.json
            with open('students.json', 'r') as f:
                data = json.load(f)
            
            # Check structure
            if 'students' not in data:
                self.log("JSON missing 'students' key", False)
                return False
            self.log("JSON has 'students' key")
            
            students = data['students']
            if not isinstance(students, list):
                self.log("'students' is not a list", False)
                return False
            self.log("'students' is a list")
            
            # Check for required fields in student objects
            if len(students) > 0:
                required_fields = {'id', 'name', 'score'}
                for i, student in enumerate(students):
                    actual_fields = set(student.keys())
                    if not required_fields.issubset(actual_fields):
                        self.log(f"Student {i} missing fields. Expected: {required_fields}, Got: {actual_fields}", False)
                        return False
                self.log(f"All {len(students)} students have required fields")
            
            # Check for expected names
            expected_names = {'Alice', 'Bob'}
            actual_names = {s['name'] for s in students}
            
            if expected_names == actual_names:
                self.log("JSON has all expected student names")
            else:
                self.log(f"JSON names mismatch. Expected: {expected_names}, Got: {actual_names}", False)
                return False
            
            return True
            
        except Exception as e:
            self.log(f"Error in Part C: {str(e)}", False)
            return False
    
    def test_part_d(self) -> bool:
        """Test Part D: Pickle Files"""
        print("\n" + "="*60)
        print("Testing Part D: Pickle Files")
        print("="*60)
        
        script_name = f"Ex_3_D_{self.student_id}.py"
        
        try:
            # Check if script exists
            if not os.path.exists(script_name):
                self.log(f"Script {script_name} not found", False)
                return False
            self.log(f"Found script {script_name}")
            
            # Import and run the module
            spec = importlib.util.spec_from_file_location("part_d", script_name)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Check if student.pkl exists
            if not os.path.exists('student.pkl'):
                self.log("student.pkl not found", False)
                return False
            self.log("student.pkl exists")
            
            # Load and validate pickled object
            with open('student.pkl', 'rb') as f:
                student = pickle.load(f)
            
            # Check if it's a Student instance
            if not hasattr(student, 'name') or not hasattr(student, 'scores'):
                self.log("Pickled object doesn't have 'name' and 'scores' attributes", False)
                return False
            self.log("Pickled object has 'name' and 'scores' attributes")
            
            # Validate data
            if student.name == "Alice":
                self.log("Student name is 'Alice'")
            else:
                self.log(f"Expected name 'Alice', got '{student.name}'", False)
                return False
            
            if isinstance(student.scores, list) and len(student.scores) == 3:
                self.log(f"Student has 3 scores: {student.scores}")
            else:
                self.log(f"Expected list of 3 scores, got {student.scores}", False)
                return False
            
            return True
            
        except Exception as e:
            self.log(f"Error in Part D: {str(e)}", False)
            return False
    
    def run_all_tests(self):
        """Run all tests and display summary"""
        print("\n" + "█"*60)
        print("     EXERCISE 3 TEST RUNNER")
        print("     Student ID: " + self.student_id)
        print("█"*60)
        
        # Run all parts
        part_a_pass = self.test_part_a()
        part_b_pass = self.test_part_b()
        part_c_pass = self.test_part_c()
        part_d_pass = self.test_part_d()
        
        # Summary
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests / self.total_tests * 100):.1f}%")
        
        print("\nPart Results:")
        print(f"  Part A (File I/O):     {'✓ PASS' if part_a_pass else '✗ FAIL'}")
        print(f"  Part B (CSV):          {'✓ PASS' if part_b_pass else '✗ FAIL'}")
        print(f"  Part C (JSON):         {'✓ PASS' if part_c_pass else '✗ FAIL'}")
        print(f"  Part D (Pickle):       {'✓ PASS' if part_d_pass else '✗ FAIL'}")
        
        print("="*60)
        
        if self.passed_tests == self.total_tests:
            print("🎉 ALL TESTS PASSED! 🎉")
        else:
            print("⚠️  Some tests failed. Please review the output above.")
        print("="*60 + "\n")
        
        return self.passed_tests == self.total_tests

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 test_runner_ex3.py <student_id>")
        print("Example: python3 test_runner_ex3.py 6788001")
        sys.exit(1)
    
    student_id = sys.argv[1]
    runner = TestRunner(student_id)
    success = runner.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
