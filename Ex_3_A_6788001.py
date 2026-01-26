"""
Exercise 3 Part A: Basic File I/O
Author: [Your Name]
Student ID: 6788001
"""

# Task 1 & 2: Create and write to note.txt
def write_note():
    with open('note.txt', 'w') as file:
        file.write("Sahatsawat Kanpai 6788001\n")
        file.write("sahatsawat.k@example.com\n")
        file.write("ITCS251\n")
    print("Successfully wrote to note.txt")

# Task 3: Read and print each line separately
def read_note():
    print("\nReading from note.txt:")
    print("-" * 40)
    with open('note.txt', 'r') as file:
        for line_number, line in enumerate(file, 1):
            print(f"Line {line_number}: {line.strip()}")

if __name__ == "__main__":
    # Execute tasks
    write_note()
    read_note()
