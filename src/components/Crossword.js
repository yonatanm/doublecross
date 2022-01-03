import { useState, useEffect } from "react";
import Board from "./Board";
import { saveNewCrossword, getCrossword } from "../Firebase";
import { useParams } from "react-router-dom";

const clg = require("crossword-layout-generator");

export default function Crossword() {
  let params = useParams();

  const theId = params.id;
  console.log("theId ", theId);
  const [layout, setLayout] = useState();
  const [textInput, setTextInput] = useState(
    !theId
      ? 
`CLUE1 - איתמר
CLUE2 - רותמ
CLUE3 - גוני
CLUE4 - ענבר 
CLUE5 - אולי
CLUE6 - לוטמ
CLUE7 - סיני
CLUE8 - שקד
CLUE9 - גורי`
      : undefined
  );

  useEffect(() => {
    (async () => {
      console.log("@@@@@@@@");
      if (theId) {
        const { model } = await getCrossword(theId);
        console.log("model is", model);
        setTextInput(model.textInput);
        setLayout({
          cols: model.cols,
          rows: model.rows,
          table: JSON.parse(model.table),
          result: model.result,
        });
      }
    })();
  }, [theId]);

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
    _layout.table = _layout.table.map((r) => r.reverse());
    _layout.result = _layout.result.map((d) => ({
      ...d,
      startx: _layout.cols + 1 - d.startx,
    }));

    setLayout(_layout);
  }

  function handleChange(event) {
    setTextInput(event.target.value);
  }

  async function save() {
    const model = {};
    model.textInput = textInput;
    model.cols = layout.cols;
    model.rows = layout.rows;
    model.table = JSON.stringify(layout.table);
    model.result = layout.result;
    await saveNewCrossword(model);
  }
  function showBoard() {
    if (layout) {
      return <Board layout={layout}></Board>;
    } else {
      return <h1>not Yet....</h1>;
    }
  }

  function showMissing(){
    if (!layout) return <></>
    const missings = layout.result.filter(d=>d.orientation === 'none')
    if (missings.length===0) {
      return <></>
    }
    return <div>
      {missings.map((d,i)=>{
        return <div key={i}>{d.clue} {d.answer}</div>
      })}
    </div>
  }
  return (
    <div>
      <textarea value={textInput} onChange={handleChange}></textarea>
      <button onClick={build}>Build it!</button>
      <button onClick={save}>Save</button>
      {showMissing()}
      {showBoard()}
    </div>
  );
}
