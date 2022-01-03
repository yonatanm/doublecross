import { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import Board from "./Board";
import { Definitions, defsToText, textToDefs } from "./Definitions";
import { saveNewCrossword, getCrossword, updateCrossword } from "../Firebase";
import { useParams } from "react-router-dom";

const clg = require("crossword-layout-generator");

export default function Crossword() {
  const navigate = useNavigate();
  
  let params = useParams();

  const theId = params.id;
  const [model, setModel] = useState();
  const [defs, setDefs] = useState();

  console.log("theId ", theId, " model", model);

  useEffect(() => {
    (async () => {
      console.log("@@@@@@@@");
      if (theId) {
        const record = await getCrossword(theId);
        console.log('record', record)
        const m = JSON.parse(JSON.stringify(record));
        m.table = resultToTable(
          record.result,
          record.cols,
          record.rows
        );
        console.log("model is about ot be", m);
        setModel(m);
        const d = textToDefs(record.textInput);
        setDefs(d);
      }
    })();
  }, [theId]);

  function build() {
    const d = defs || textToDefs(model.textInput);
    console.log("in build, defs", defs);
    const _layout = clg.generateLayout(d);
    // _layout.table = _layout.table.map((r) => r.reverse());
    _layout.result = _layout.result.map((d) => ({
      ...d,
      startx: _layout.cols + 1 - d.startx,
    }));
    const t = resultToTable(_layout.result, _layout.cols, _layout.rows);
    console.log("t", t);

    const m = JSON.parse(JSON.stringify(model));
    m.result = JSON.parse(JSON.stringify(_layout.result));
    m.table = t;
    m.cols = _layout.cols;
    m.rows = _layout.rows;

    console.log("now m is ", m);
    setDefs(d);
    setModel(m);
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
    const m = JSON.parse(JSON.stringify(model || {}));
    m.textInput = text;
    console.log("model m is ", m);
    setModel(m);
  }

  async function save() {
    if (!theId) {
      const m = JSON.parse(JSON.stringify(model));
      m.table = {};
      m.table_string = "";
      console.log("model to save", m);
      const newRecId = await saveNewCrossword(m);
      console.log("new recId", newRecId);
      navigate(`/crosswords/${newRecId}`)
    } else {
      const m = JSON.parse(JSON.stringify(model));
      m.table = {};
      m.table_string = "";
      console.log("model to save", m);
      await updateCrossword(theId, m);
    }
  }

  function showBoard() {
    if (model && model.result) {
      console.log(`YAYAYY`, model);
      return (
        <Board
          cols={model.cols}
          rows={model.rows}
          result={model.result}
          table={model.table}
        ></Board>
      );
    } else {
      console.log("@@@ NO BOARD");
      return <h1>no board</h1>;
    }
  }
  // } else {
  //   console.log(`BBOOOIIII ${model && model.result}`)
  //   return (<h1>not Yettttt....</h1>);
  // }
  // }

  function showMissing() {
    if (!model || !model.layout) return <></>;
    const missings = model.layout.result.filter(
      (d) => d.orientation === "none"
    );
    if (missings.length === 0) {
      return <></>;
    }
    return (
      <div>
        {missings.map((d, i) => {
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
    if (theId && !model) {
      return <></>;
    } else {
      return (
        <Definitions
          text={model?.textInput}
          defs={defs}
          onChange={onDefsChange}
        ></Definitions>
      );
    }
  };
  return (
    <div>
      {showDefinitions()}
      {showMissing()}
      <button onClick={build}>Build it!</button>
      <button onClick={save}>Save</button>
      {showBoard()}
    </div>
  );
}
