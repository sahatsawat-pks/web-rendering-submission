const header = "Sum (26)";
const regex = /^(Sum|Total)(?:\s*\((\d+)\))?$/i;
const match = header.match(regex);
console.log("Match:", match);

const header2 = "Total";
console.log("Match2:", header2.match(regex));

const header3 = "Sum";
console.log("Match3:", header3.match(regex));

const header4 = "Surname";
console.log("Match4:", header4.match(regex));
