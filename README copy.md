[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/2ZtkjwdY)
# Faculty of Information and Communication Technology <br/> ITCS223 Introduction to Web Development <br/> Basic JavaScript Lab
## Instruction
- This exercise consists of one task related to basic JS,
- The students need to submit the lab via GitHub by the given deadline.

## Direction
Hogwarts School of Witchcraft and Wizardry requested that students develop a JavaScript-based solution to analyze House Cup scores.
In this lab, you will practice JavaScript syntax and logical reasoning by working with a Harry Potter–themed dataset representing wizard students and their activity points.

You will construct and manipulate arrays and objects, compute student and house scores, apply iterative and sorting operations, 
and produce a console-based report summarizing house rankings and individual student performance.
All tasks must be implemented using **JavaScript** only, with outputs displayed via the console.
**All JavaScript code must be contained in `script.js`.**


0. Create an HTML file named `main.html` and link it to an external JavaScript file named `script.js`.
   All JavaScript code for this lab must be written in script.js
1. In `script.js`, copy the following wizards array exactly as provided.
   
    ``` JavaScript
    // ----------------------
    // GIVEN DATA (DO NOT MODIFY)
    // ----------------------
    const wizards = [
      { id: "HP001", name: "Harry", house: "Gryffindor", events: [10, -5, 15, 20] },
      { id: "HG002", name: "Hermione", house: "Gryffindor", events: [20, 20, 10, 15] },
      { id: "RW003", name: "Ron", house: "Gryffindor", events: [5, 0, -10, 10] },
      { id: "DM004", name: "Draco", house: "Slytherin", events: [10, 10, 20, 5] },
      { id: "PP005", name: "Pansy", house: "Slytherin", events: [5, -5, 10, 10] },
      { id: "LL006", name: "Luna", house: "Ravenclaw", events: [15, 10, 0, 10] },
      { id: "CC007", name: "Cho", house: "Ravenclaw", events: [10, -5, 5, 5] },
      { id: "NH008", name: "Neville", house: "Hufflepuff", events: [10, 10, 10, 20] },
      { id: "CD009", name: "Cedric", house: "Hufflepuff", events: [20, 0, -10, -5] }
    ];
    ```
   
   After defining the array, display its contents in the browser console using `console.log()` to verify that the data has been loaded correctly **(Task 1)**.
   The expected output of this step is:
   <br><img src="expected_output/output-task1.png" width="650px">
   
2. **Compute the individual total event points (Task 2)**
   - Create a new property `totalPoints` for each wizard by summing all event scores.
   - Print `wizards` out to check the result
   <br><img src="/expected_output/output-task2.png" width="680px">  
     
3. **Compute the `house` score**
   - Given the following `houses` object,
     
   ```
     const houses = {
          Gryffindor: { total: 0, count: 0 },
          Slytherin: { total: 0, count: 0 },
          Ravenclaw: { total: 0, count: 0 },
          Hufflepuff: { total: 0, count: 0 },
    };

   ```
     
   - Compute the `total` and `count` of each house (**Task 3**)
   - Print `houses` to check the computed result.
     <br><img src="/expected_output/output-task3.png" width="680px">
     
5. **Rank and find the winner (Task 4)**
   
   JavaScript provides the `sort()` method to reorder elements in an array.
   
   **Example**: Using `sort()` with Objects
   ```
    const students = [
      { name: "Alice", score: 75 },
      { name: "Bob", score: 40 },
      { name: "Charlie", score: 90 }
    ];
    
    // Sort students by score (descending order)
    students.sort((a, b) => b.score - a.score);
    
    // Sort students by score (ascending order)
    students.sort((a, b) => a.score - b.score);
   ```

7. **Show the report**
   The report (**Task 5**) in the console must consist of
   - The winning house, the complete house ranking, and all four houses ordered by their total scores
   - The top student, the detention student, and a full list of students sorted by total points
   The expected output is:
   <br><img src="/expected_output/output-task5.png" width="650px">

<hr>

## Submission
Submit (commit) the `main.html` and `script.js` file within the given deadline
