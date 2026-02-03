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

// Task 1
console.log(wizards)

// Task 2

for(let wizard of wizards) {
    let sum = 0;
    for(let i = 0; i < wizard.events.length; i++) {
        sum += wizard.events[i];
    }
    wizard.totalPoints = sum;
}

console.log(wizards)

// Task 3

const houses = {
       Gryffindor: { total: 0, count: 0 },
       Slytherin: { total: 0, count: 0 },
       Ravenclaw: { total: 0, count: 0 },
       Hufflepuff: { total: 0, count: 0 },
};

for(let wizard of wizards) {
   houses[wizard.house].total += wizard.totalPoints;
   houses[wizard.house].count += 1;
};

console.log(houses);

// Task 4 + 5


wizards.sort((a, b) => b.totalPoints - a.totalPoints);
const houseRanking = Object.entries(houses)
  .map(([name, data]) => ({ name, ...data }))
  .sort((a, b) => b.total - a.total);

console.log(`The winning house is ${houseRanking[0].name}`)

houseRanking.forEach((house, index) => {
  console.log(`Rank ${index + 1}: ${house.name} with the total score of ${house.total}`);
});

console.log(`The best student is ${wizards[0].name}`)
console.log(`The detention student is ${wizards[wizards.length - 1].name}`)

wizards.forEach((wizard, index) => {
    console.log(`Rank ${index + 1}: ${wizard.name} with the total score of ${wizard.totalPoints}`);
})