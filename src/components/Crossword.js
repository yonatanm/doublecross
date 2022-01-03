import { useState, useEffect } from "react";
import Board from "./Board";
import { Definitions, defsToText, textToDefs } from "./Definitions";
import { saveNewCrossword, getCrossword } from "../Firebase";
import { useParams } from "react-router-dom";

const clg = require("crossword-layout-generator");

export default function Crossword() {
  let params = useParams();

  const theId = params.id;
  console.log("theId ", theId);
  const [layout, setLayout] = useState();
  const [defs, setDefs] = useState();

  useEffect(() => {
    (async () => {
      console.log("@@@@@@@@");
      if (theId) {
        const record = await getCrossword(theId);
        const model = record.model;
        const d = textToDefs(model.textInput);
        console.log("d ", d);
        setDefs(d);

        // console.log("model text Input", model.textInput);
        setLayout({
          cols: model.layout.cols,
          rows: model.layout.rows,
          table: JSON.parse(model.layout.table),
          result: model.layout.result,
        });
      }
    })();
  }, [theId]);

  function build() {
    const _layout = clg.generateLayout(defs);
    _layout.table = _layout.table.map((r) => r.reverse());
    _layout.result = _layout.result.map((d) => ({
      ...d,
      startx: _layout.cols + 1 - d.startx,
    }));

    setLayout(_layout);
  }

  function onDefsChange(d) {
    console.log("defs ", d);
    setDefs(d);
  }

  // async function save() {
  //   const model = {};
  //   model.textInput = defsToText(defs);
  //   model.layout = {
  //     cols: layout.cols,
  //     rows: layout.rows,
  //     table: JSON.stringify(layout.table),
  //     result: layout.result,
  //   };
  //   await saveNewCrossword(model);
  // }
  function showBoard() {
    if (layout) {
      return <Board layout={layout}></Board>;
    } else {
      return <h1>not Yet....</h1>;
    }
  }

  function showMissing() {
    if (!layout) return <></>;
    const missings = layout.result.filter((d) => d.orientation === "none");
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
    if (!theId || layout) {
      return <Definitions defs={defs} onChange={onDefsChange}></Definitions>;
    } else {
      return <></>;
    }
  };
  return (
    <div>
      {showDefinitions()}
      <button onClick={build}>Build it!</button>
      {/* <button onClick={save}>Save</button> */}
      {showMissing()}
      {showBoard()}
    </div>
  );
}
