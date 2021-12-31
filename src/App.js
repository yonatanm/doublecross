import logo from "./logo.svg";
import "./App.css";
import { useState } from "react";
import MyCrossword from "mycrossword";
import "mycrossword/dist/index.css";

const input_json = [
  {
    clue: "that which is established as a rule or model by authority, custom, or general consent",
    answer: "standard",
  },
  { clue: "a machine that computes", answer: "computer" },
  {
    clue: "the collective designation of items for a particular purpose",
    answer: "equipment",
  },
  { clue: "an opening or entrance to an inclosed place", answer: "port" },
  {
    clue: "a point where two things can connect and interact",
    answer: "interface",
  },
];

var clg = require("crossword-layout-generator");
var layout = clg.generateLayout(input_json);

const data = {
  id: "simple/1",
  number: 1,
  name: "Simple Crossword #1",
  date: 1542326400000,
  entries: [
    {
      id: "1-across",
      number: 1,
      humanNumber: "1",
      clue: "Toy on a string (2-2)",
      direction: "across",
      length: 4,
      group: ["1-across"],
      position: { x: 0, y: 0 },
      separatorLocations: {
        "-": [2],
      },
      solution: "YOYO",
    },
    {
      id: "4-across",
      number: 4,
      humanNumber: "4",
      clue: "Have a rest (3,4)",
      direction: "across",
      length: 7,
      group: ["4-across"],
      position: { x: 0, y: 2 },
      separatorLocations: {
        ",": [3],
      },
      solution: "LIEDOWN",
    },
    {
      id: "1-down",
      number: 1,
      humanNumber: "1",
      clue: "Colour (6)",
      direction: "down",
      length: 6,
      group: ["1-down"],
      position: { x: 0, y: 0 },
      separatorLocations: {},
      solution: "YELLOW",
    },
    {
      id: "2-down",
      number: 2,
      humanNumber: "2",
      clue: "Bits and bobs (4,3,4)",
      direction: "down",
      length: 7,
      group: ["2-down", "3-down"],
      position: { x: 3, y: 0 },
      separatorLocations: {
        ",": [4, 7],
      },
      solution: "ODDSAND",
    },
    {
      id: "3-down",
      number: 3,
      humanNumber: "3",
      clue: "See 2",
      direction: "down",
      length: 4,
      group: ["2-down", "3-down"],
      position: {
        x: 6,
        y: 1,
      },
      separatorLocations: {},
      solution: "ENDS",
    },
  ],
  solutionAvailable: true,
  dateSolutionAvailable: 1542326400000,
  dimensions: {
    cols: 13,
    rows: 13,
  },
  crosswordType: "quick",
};

var rows = layout.rows;
var cols = layout.cols;
var table = layout.table; // table as two-dimensional array
var output_html = layout.table_string; // table as plain text (with HTML line breaks)
var output_json = layout.result; //

// console.log(rows);
// console.log(cols);
// console.log(table);
// console.log(output_html);
// console.log(output_json);

function App() {
  const [lg, setLg] = useState();
  const [textInput, setTextInput] = useState()
  function activateLasers() {
    let x = {
      value: [
        ["Y", "E", "L", "L", "O", "W", "", "", "", "", "", "", ""],
        ["O", "", "I", "", "", "", "", "", "", "", "", "", ""],
        ["Y", "", "E", "", "", "", "", "", "", "", "", "", ""],
        ["O", "D", "D", "S", "A", "N", "D", "", "", "", "", "", ""],
        ["", "", "O", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "W", "", "", "", "", "", "", "", "", "", ""],
        ["", "E", "N", "D", "S", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", ""],
      ],
    };
    console.log("textInput = ", textInput);
    setLg(x);
    return x;
  }

  function handleChange(event) {
    setTextInput(event.target.value);
  }


  return (    
    <div>
      <textarea value={textInput} onChange={handleChange}>
  
</textarea>
      <button onClick={activateLasers}>Solve</button>
    {lg && 
        <MyCrossword
        id="crossword-1"
        data={data}
        loadGrid={lg}
        saveGrid={()=>{}}
      /> 
    }
    </div>
  );
}

export default App;
