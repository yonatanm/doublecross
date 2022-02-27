import { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Fab from "@mui/material/Fab";

const KAF_SOPHIT = "ך";
const KAF = "כ";

const MEM_SOPHIT = "ם";
const MEM = "מ";

const NUN_SOPHIT = "ן";
const NUN = "נ";

const PEY_SOPHIT = "ף";
const PEY = "פ";

const TSADY_SOPHIT = "ץ";
const TSADY = "צ";

const lastLetters = {};
lastLetters[KAF_SOPHIT] = KAF;
lastLetters[MEM_SOPHIT] = MEM;
lastLetters[NUN_SOPHIT] = NUN;
lastLetters[PEY_SOPHIT] = PEY;
lastLetters[TSADY_SOPHIT] = TSADY;

function Definitions(params) {
  console.log(`DDD <Definitions> params?.defs?.length`, params?.defs?.length);

  const [theDefs, setTheDefs] = useState([]);
  const [newAns, setNewAns] = useState("");
  const [newClue, setNewClue] = useState("");
  const showAddDef = params.showAddDef

  useEffect(() => {
    console.log("DDD in useEffect -1-1-1 ", params?.defs?.length);
    if (params?.defs !== undefined) {
      console.log("DDD in useEffect 0000 ", params?.defs?.length);
      setTheDefs(params.defs);
    } else {
      setTheDefs([]);
    }
  }, [params.defs]);

  useEffect(() => {
    console.log("DDD in useEffect 1", theDefs?.length);
    if (JSON.stringify(params?.defs || []) !== JSON.stringify(theDefs || [])) {
      console.log("DDD in useEffect 2 ", theDefs?.length);
      if (theDefs?.length > 0) {
        params.onChange(theDefs);
      }
    }
    //
  }, [theDefs]);

  const updatedAnswer = (e, d, i) => {
    console.log("updatedAnswer ", e.target.value);
    d.answer = e.target.value || "";
    if (d.answer.trim().length === 0 && theDefs[i].clue.trim().length == 0) {
      setTheDefs(theDefs.filter((dd, j) => i >= 0 && j !== i));
      return;
    }
    const defs = JSON.parse(JSON.stringify(theDefs));
    // console.log(theDefs)
    setTheDefs(defs);
  };

  const updatedClue = (e, d, i) => {
    console.log("updatedClue ", e.target.value);
    // const defs = JSON.parse(JSON.stringify(theDefs));
    d.clue = e.target.value || "";

    if (d.clue.trim().length === 0 && theDefs[i].answer.trim().length == 0) {
      setTheDefs(theDefs.filter((dd, j) => i >= 0 && j !== i));
      return;
    }

    const defs = JSON.parse(JSON.stringify(theDefs));
    // console.log(theDefs)
    setTheDefs(defs);
  };

  const del = (i) => {
    setTheDefs(theDefs.filter((x, j) => j !== i));
  };
  const add = () => {
    let defs = JSON.parse(JSON.stringify(theDefs));
    defs = [{ clue: newClue.trim(), answer: newAns.trim() }].concat(defs)
    setTheDefs(defs);
    setNewClue("");
    setNewAns("");
  };

  const updateNewAns = (e) => {
    setNewAns(e.target.value || "");
  };
  const updateNewClue = (e) => {
    setNewClue(e.target.value || "");
  };

  const isAddButtonEnabled = () => {
    return newAns?.trim()?.length > 0 && newClue?.trim()?.length;
  };
  const renderDefs = () => {
    console.log("DDD renderDefs theDefs.length", theDefs?.length);
    const existings = (theDefs || []).map((d, i) => {
      return (
        <div className="defs-row" key={i}>
          <TextField
            className="defs-col defs-clue"
            autoComplete="off"
            key="clue"
            label="הגדרה"
            inputProps={{
              size: Math.min(50, Math.max(20, d?.clue?.length)),
            }}
            variant="standard"
            onChange={(e) => updatedClue(e, d, i)}
            value={d.clue}
          />
          <TextField
            className="defs-col defs-answer"
            autoComplete="off"
            key="answer"
            label="תשובה"
            variant="standard"
            onChange={(e) => updatedAnswer(e, d, i)}
            value={d.answer}
            inputProps={{
              size: Math.min(50, Math.max(20, d?.answer?.length)),
            }}
          />
        </div>
      );
    });
    return (
      <>
        {showAddDef && <div className="new-defss-block">
          <div className="defs-row">
            <TextField
              className="defs-col defs-clue"
              autoComplete="off"
              key="clue"
              label="הגדרה"
              inputProps={{ size: 20 }}
              variant="standard"
              onChange={(e) => updateNewClue(e)}
              value={newClue}
            />
            <TextField
              className="defs-col defs-answer"
              autoComplete="off"
              key="answer"
              label="תשובה"
              variant="standard"
              onChange={(e) => updateNewAns(e)}
              value={newAns}
              inputProps={{ size: 20 }}
            />
            <Fab
              color="primary"
              aria-label="add"
              disabled={!isAddButtonEnabled()}
              onClick={add}
            >
              <AddIcon />
            </Fab>           
          </div>
        </div>}
        {existings}

        {/* <div className="add-def-button">
          <Fab color="primary" aria-label="שמור" onClick={add}>
            <AddIcon />
          </Fab>
        </div> */}
      </>
    );
  };

  return <>{renderDefs()}</>;
}

const textToDefs = (t) => {
  console.log("textToDefs t=", t);
  if (!t) return [];
  var lines = t
    .replaceAll(/[\r\n:]+/g, "~")
    .split("~")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

  const defs = lines.map((l) => {
    const index = l.indexOf("-");
    const answer = cleanAnswer(l.substring(0, index).trim());
    const clue = l.substring(index + 1).trim();
    return { clue, answer };
  });
  console.log("in textToDefs", t, defs);
  return defs;
};

const cleanAnswer = (a) => {
  const noDblSpaces = (a || "")
    .split(" ")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .join(" ");
  const noLastLetters = noDblSpaces
    .split("")
    .map((x) => lastLetters[x] || x)
    .join("");
  console.log("noLastLetters", noLastLetters);
  return noLastLetters;
};
export { Definitions, textToDefs, cleanAnswer };
