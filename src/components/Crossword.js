import { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import Board from "./Board";
import { formatDate } from "../utils";
import { Definitions, textToDefs } from "./Definitions";
import { saveNewCrossword, getCrossword, updateCrossword } from "../Firebase";
import { useParams } from "react-router-dom";

const clg = require("crossword-layout-generator");

export default function Crossword() {
  const navigate = useNavigate();

  let params = useParams();

  const theId = params.id;
  const [crossword, setCrossword] = useState();
  const [defs, setDefs] = useState();

  console.log("theId ", theId, " crossword", crossword);

  useEffect(() => {
    (async () => {
      console.log("@@@@@@@@");
      if (theId) {
        const record = await getCrossword(theId);
        console.log("record", record);
        const cw = modelToCrossword(record)
        setCrossword(cw);
        const d = textToDefs(cw.textInput);
        setDefs(d);
      }
    })();
  }, [theId]);

  const modelToCrossword = (model)=>{
    const cw = JSON.parse(JSON.stringify(model));
    cw.table = resultToTable(model.result, model.cols, model.rows);
    console.log("cw is about ot be", cw);
    return cw;    
  }
  
  function build() {
    const d = defs || textToDefs(crossword.textInput);
    const _layout = clg.generateLayout(d);
    console.log('##### result', _layout.result)
    console.log('##### table', _layout.table)
    const leftOut = _layout.result.filter(
      (d) =>
        d.startx < 1 ||
        d.starty < 1 ||
        !d.orientation ||
        d.orientation === "none"
    );
    _layout.result = _layout.result.filter(
      (d) => d.startx > 0 && d.starty > 0 && d.orientation !== "none"
    );
    _layout.result = _layout.result.map((d) => ({
      ...d,
      origStartx: d.startx,
      startx: _layout.cols + 1 - d.startx,
    }));
    console.log('@@@@ result', _layout.result)


    _layout.result.sort((a, b) => {
      let diff = 0;
      if (a.startx !== b.startx) {
        diff = a.startx - b.startx;
      } else {
        diff = a.starty - b.starty;
      }
      return diff;
    });

    let i = 0;
    let x = 0;
    let y = 0;
    _layout.result.forEach((v, index) => {
      let d = _layout.result[index];
      if (d.startx !== x || d.starty !== y) {
        x = d.startx;
        y = d.starty;
        i++;
      }
      d.position = i;
    });

    const t = resultToTable(_layout.result, _layout.cols, _layout.rows);
    console.log("@@@@ t", t);

    const m = JSON.parse(JSON.stringify(crossword));
    m.result = JSON.parse(JSON.stringify(_layout.result));
    m.table = t;
    m.cols = _layout.cols;
    m.rows = _layout.rows;
    m.leftOut = JSON.parse(JSON.stringify(leftOut));

    console.log("now m is ", m);
    setDefs(d);
    setCrossword(m);
  }

  const resultToTable = (result, cols, rows) => {
    console.log(`cols ${cols} rows ${rows}`);
    const row = [];
    for (let i = 0; i < cols; i++) {
      row.push("-");
    }
    const t = [];
    for (let i = 0; i < rows; i++) {
      t.push([...row]);
    }
    result.forEach((d) => {
      if (d.orientation === "across") {
        for (let i = 0; i < d.answer.length; i++) {
          t[d.starty - 1][d.startx - 1 - i] = d.answer.charAt(i);
        }
      }
      if (d.orientation === "down") {
        for (let i = 0; i < d.answer.length; i++) {
          t[d.starty - 1 + i][d.startx - 1] = d.answer.charAt(i);
        }
      }
    });
    return t;
  };

  function onDefsChange(d, text) {
    console.log("defs d:", d, " text:", text);
    setDefs(d);
    const cw = JSON.parse(JSON.stringify(crossword || {}));
    cw.textInput = text;
    setCrossword(cw);
  }

  async function save() {
    const model = JSON.parse(JSON.stringify(crossword));
    delete model.table
    delete model.table_string
    delete model.leftOut
    console.log("model to save", model);
    if (!theId) {
      const newRecId = await saveNewCrossword(model);
      console.log("new recId", newRecId);
      navigate(`/crosswords/${newRecId}`);
    } else {
      await updateCrossword(theId, model);
    }
  }

  function showBoard() {
    if (crossword && crossword.result) {
      return (
        <Board
          cols={crossword.cols}
          rows={crossword.rows}
          result={crossword.result}
          table={crossword.table}
        ></Board>
      );
    } else {
      return <h1>no board</h1>;
    }
  }

  function showMissing() {
    if (!crossword?.leftOut || crossword?.leftOut.length===0) return <></>;
    return (
      <div>
        {crossword.leftOut.map((d, i) => {
          return (
            <div key={i}>
              {d.clue} {d.answer}
            </div>
          );
        })}
      </div>
    );
  }
  const showDefinitions = () => {
    if (theId && !crossword) {
      return <></>;
    } else {
      return (
        <Definitions
          text={crossword?.textInput}
          defs={defs}
          onChange={onDefsChange}
        ></Definitions>
      );
    }
  };

  const showInfo = () => {
    if (theId && crossword?.result) {
      const created = formatDate(new Date(crossword.createdAt.seconds * 1000));
      const update = formatDate(
        new Date(crossword.updatedAt.seconds * 1000 || Date.now())
      );

      return (
        <div>
          <h1 dir="rtl">נוצר ב-{created}</h1>
          {crossword.updatedAt ? (
            <h1 dir="rtl">עודכן לאחרונה ב-{update}</h1>
          ) : (
            <></>
          )}
        </div>
      );
    }
  };

  return (
    <div>
      {showInfo()}
      {showDefinitions()}
      {showMissing()}
      <button onClick={build}>Build it!</button>
      <button onClick={save}>Save</button>
      {showBoard()}
    </div>
  );
}
