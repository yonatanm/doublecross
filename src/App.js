import logo from "./logo.svg";
import "./App.scss";
import { useState } from "react";
import Board from './components/Board'
const clg = require("crossword-layout-generator");


function App() {
  const [data, setData] = useState();
  const [layout, setLayout] = useState();
  const [textInput, setTextInput] =
    // useState(`CLUE1 - AAOA
    // CLUE2 - BBBOB`);
    useState(`
  CLUE1- שלומ 
   CLUE2- חתול 
   CLUE3 - תעלול
   CLUE4 - שמיימ `);


  function build() {
    var wordList = textInput
      .replace(/[ \r\n,;:-]+/g, ",")
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    const inputJson = [];
    for (let i = 0; i < wordList.length; i += 2) {
      inputJson.push({ clue: wordList[i], answer: wordList[i + 1] });
    }
    const _layout = clg.generateLayout(inputJson);
    console.log(`layout  col: ${_layout.cols} rows: ${_layout.rows}`);

    setLayout(_layout)
  }

  function handleChange(event) {
    setTextInput(event.target.value);
  }

  function showBoard() {
    if (layout) {
      return <Board layout={layout}></Board>;
    } else {
      return <h1>not Yet....</h1>;
    }
  }

  return (
    <div>
      <textarea value={textInput} onChange={handleChange}></textarea>
      <button onClick={build}>Build it!</button>
      {showBoard()}
    </div>
  );
}

export default App;
