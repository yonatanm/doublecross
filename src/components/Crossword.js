import { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import Board from "./Board";
import { formatDate } from "../utils";
import { Definitions, textToDefs } from "./Definitions";
import { saveNewCrossword, getCrossword, updateCrossword } from "../Firebase";
import { useParams } from "react-router-dom";
import { rankCrossword } from "../Ranker";
import Meuzan from "./Meuzan";

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
        const cw = modelToCrossword(record);
        setCrossword(cw);
        const d = textToDefs(cw.textInput);
        setDefs(d);
      }
    })();
  }, [theId]);

  const modelToCrossword = (model) => {
    const cw = JSON.parse(JSON.stringify(model));
    cw.table = resultToTable(model.result, model.cols, model.rows);
    console.log("cw is about ot be", cw);
    return cw;
  };

  function build() {
    const d = defs || textToDefs(crossword.textInput);
    console.log("initial d is ", d);

    const { candidate, r } = getBestLayout(d);
    const _layout = clg.generateLayout(candidate);
    console.log(
      "@@@@@ defs is",
      candidate,
      "the winning has rank ",
      r,
      " def is ",
      _layout.result
    );
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
    console.log("@@@@ result", _layout.result);

    _layout.result.sort((a, b) => {
      let diff = 0;
      if (a.starty !== b.starty) {
        diff = a.starty - b.starty;
      } else {
        diff = -(a.startx - b.startx);
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

  const makeDefsSpaceAware = (d) => {
    const defs = JSON.parse(JSON.stringify(d));
    for (let i = 0; i < defs.length; i++) {
      const answer = defs[i].answer;
      const clue = defs[i].clue;
      const words = answer.split(" ");
      if (words.length > 1) {
        for (let j = 1; j < words.length; j++) {
          defs.push({ clue, answer: words[j] });
        }
        defs[i].answer = words[0];
      }
    }
    console.log("w/o spaces it looks like ", defs);

    return defs;
  };

  const getBestLayout = (defs) => {
    let ll = 0;
    let ranking = 0;
    const doGetBestLayout = (d, defIndx, charIndx, type, spaces) => {
      if (spaces === 0) {
        ranking++;

        const defSpaceAware = makeDefsSpaceAware(d);
        const l = clg.generateLayout(defSpaceAware);

        const r = rankCrossword(l.result, l.table);
        console.log("  -- &&& RANKING " + ranking + " and rank is ", r);
        if (r > candidateRank) {
          console.log("  -- &&& found something intersing with new rank ", r);
          candidateRank = r;
          candidate = defSpaceAware;
        }
      }
      console.log("&&& in doGetBestLayout type ", type, defIndx, charIndx, ll);
      ll++;
      for (; defIndx < d.length; defIndx++) {
        for (; charIndx < d[defIndx].answer.length; charIndx++) {
          if (d[defIndx].answer.charAt(charIndx) !== " ") continue;
          doGetBestLayout(d, defIndx, charIndx + 1, "SPACE", spaces - 1);
          const withoutSpace = JSON.parse(JSON.stringify(d));

          // let answer = d[defIndx].answer;

          // answer = answer.slice(0, charIndx) + answer.slice(charIndx + 1);        
          // doGetBestLayout(
          //   withoutSpace,
          //   defIndx,
          //   charIndx + 1,
          //   "JOIN",
          //   spaces - 1
          // );
          // d[defIndx].answer = answer.slice(0, charIndx) +" "+answer.slice(charIndx + 1);
          
          withoutSpace[defIndx].answer =
            withoutSpace[defIndx].answer.slice(0, charIndx) +
            withoutSpace[defIndx].answer.slice(charIndx + 1);

          doGetBestLayout(
            withoutSpace,
            defIndx,
            charIndx + 1,
            "JOIN",
            spaces - 1,
          );
        }
        charIndx = 0;
      }
    };
    const numOfSpaces = defs
      .map((d) => d.answer.split(" ").length - 1)
      .reduce((acc, n) => {
        return acc + n;
      }, 0);
    console.log("numOfSpaces", numOfSpaces);
    let candidate = JSON.parse(JSON.stringify(defs));
    let candidateRank = -1;
    console.log("start with candidate", candidate);

    doGetBestLayout(candidate, 0, 0, "NATURAL", numOfSpaces, []);
    return { candidate, r: candidateRank };
  };

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
    (result || []).forEach((d) => {
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
    delete model.table;
    delete model.table_string;
    delete model.leftOut;
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
    if (!crossword?.leftOut || crossword?.leftOut.length === 0) return <></>;
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

  const showClues = () => {
    if (crossword?.result) {
      return <Meuzan result={crossword.result}></Meuzan>;
    }
    return <></>;
  };

  return (
    <div>
      {showInfo()}
      {showDefinitions()}
      {/* {showMissing()} */}
      {showClues()}
      <button onClick={build}>Build it!</button>
      <button onClick={save}>Save</button>
      {showBoard()}
    </div>
  );
}
