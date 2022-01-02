import logo from "./logo.svg";
import "./App.scss";
import { useState } from "react";
import Board from './components/Board'
const clg = require("crossword-layout-generator");


function shuffle(array) {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

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


  function next() {
    var wordList = textInput
    .replace(/[ \r\n,;:-]+/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
    const inputJson = [];
    for (let i = 0; i < wordList.length; i += 2) {
      inputJson.push({ clue: wordList[i], answer: wordList[i + 1] });
    }
    shuffle(inputJson)
    const _layout = clg.generateLayout(inputJson);
    console.log(`layout  col: ${_layout.cols} rows: ${_layout.rows}`);

    setLayout(_layout)

    
  }
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
      <button onClick={next}>Next</button>
      {showBoard()}
    </div>
  );
}

export default App;
