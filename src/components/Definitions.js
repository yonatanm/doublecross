import { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import AddIcon from "@mui/icons-material/Add";

import Fab from "@mui/material/Fab";

function Definitions(params) {
  
  console.log(`DDD <Definitions> params?.defs?.length`, params?.defs?.length);

  const [theDefs, setTheDefs] = useState();
  // const [text, setText] = useState(
  //   params.text || defsToText(params.defs) || DEFAULT_TEXT
  // );

  useEffect(() => {
    if (params?.defs?.length >0) {
      setTheDefs(params.defs)
    }
  }, [params.defs]);

  const updatedAnswer = (e, d) => {
    console.log("updatedAnswer ", e.target.value);
    
    d.answer = (e.target.value || "");
    const defs = JSON.parse(JSON.stringify(theDefs));
    // console.log(theDefs)
    setTheDefs(defs)
  };

  const updatedClue = (e, d) => {
    console.log("updatedClue ",e.target.value);
    // const defs = JSON.parse(JSON.stringify(theDefs));
    d.clue = (e.target.value || "");
    const defs = JSON.parse(JSON.stringify(theDefs));
    // console.log(theDefs)
    setTheDefs(defs)
  };

  const add = () => {

  };

  const renderDefs = () => {
    console.log("DDD theDefs.length", 
    theDefs?.length);
    if (!theDefs?.length) return <></>;
    const existings = theDefs.map((d, i) => {
      return (
        <div key={i}>
          <TextField
            key="answer"
            label="תשובה"
            variant="standard"
            onChange={(e) => updatedAnswer(e, d)}
            value={d.answer}
          />

          <TextField
            key="clue"
            label="הגדרה"
            inputProps={{
              size: d.clue.length,
            }}
            variant="standard"
            onChange={(e) => updatedClue(e, d)}
            value={d.clue}
          />
        </div>
      );
    });

    const newDefs = [
      <div key="empty-def" className="empty-def">
        <TextField key="new-answer" label="תשובה" variant="standard" />

        <TextField
          key="new-clue"
          label="הגדרה"
          inputProps={{
            size: 20,
          }}
          variant="standard"
        />

        <Fab color="primary" aria-label="שמור">
          <AddIcon onClick={add} />
        </Fab>
      </div>,
    ];
    return newDefs.concat(existings);
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
