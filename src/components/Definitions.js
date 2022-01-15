import { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import AddIcon from "@mui/icons-material/Add";

import Fab from "@mui/material/Fab";
const DEF_DEFS = [
  {
    answer: `כל האמצעים כשרים`,
    clue: `סוס-רפה-כלב נחש-כבשה-חמור חזיר-תרנגול-פיל`,
  },
  {
    answer: `לקהל הרחב`,
    clue: `דיאטה לכולם`,
  },
];


function Definitions(params) {
  console.log(`DDD <Definitions> params?.defs?.length`, params?.defs?.length);

  const [theDefs, setTheDefs] = useState();
  const [newAns, setNewAns] = useState();
  const [newClue, setNewClue] = useState();

  useEffect(() => {
    console.log("DDD in useEffect -1-1-1 ", params?.defs?.length);
    if (params?.defs !== undefined) {
      console.log("DDD in useEffect 0000 ", params?.defs?.length);
      setTheDefs(params.defs);
    } else { 
      setTheDefs(DEF_DEFS)
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
    if (
      defs.length > 1 &&
      defs[0]?.answer?.trim()?.length > 0 &&
      defs[0]?.clue?.trim()?.length > 0
    ) {
      defs = [{ clue: "", answer: "" }].concat(defs);
      setTheDefs(defs);
    }
    // setNewClue("");
    // setNewAns("");
  };

  const updateNewAns = (v) => {
    setNewAns(v);
  };
  const updateNewClue = (v) => {
    setNewClue(v);
  };

  const renderDefs = () => {
    console.log("DDD renderDefs theDefs.length", theDefs?.length);
    const existings = (theDefs || []).map((d, i) => {
      return (
        <div className="defs-row" key={i}>
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
        </div>
      );
    });
    return (
      <>
        <div className="add-def-button">
          <Fab color="primary" aria-label="שמור" onClick={add}>
            <AddIcon />
          </Fab>
        </div>
        {existings}
      </>
    );
  };

  return <>{renderDefs()}</>;
}

const defsToText = (defs) => {
  let s = "";
  if (defs) {
    s = defs
      .map((d) => `${d.clue} - ${d.answer}`)
      .join("\n")
      .trim();
  }
  console.log(`defs To TExt [${!!defs}] !!!! [${s}] !!`);
  return s;
};

const textToDefs = (t) => {
  console.log("textToDefs t=", t);
  if (!t) return [];
  var lines = t
    .replace(/[\r\n:]+/g, "~")
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
    .map((x) => (x === "ם" ? "מ" : x))
    .map((x) => (x === "ן" ? "מ" : x))
    .map((x) => (x === "ך" ? "כ" : x))
    .map((x) => (x === "ף" ? "פ" : x))
    .map((x) => (x === "ץ" ? "צ" : x))
    .join("");
  return noLastLetters;
};
export { Definitions, defsToText, textToDefs };
