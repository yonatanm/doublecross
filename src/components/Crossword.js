import { useState, useEffect, useContext, forwardRef } from "react";

import { useNavigate } from "react-router-dom";

import Board from "./Board";
import { formatDate } from "../utils";
import { Definitions, textToDefs, cleanAnswer } from "./Definitions";
import {
  saveNewCrossword,
  getCrossword,
  updateCrossword,
  uploadScreenshot,
} from "../Firebase";
import { useParams } from "react-router-dom";
import { rankCrossword } from "../Ranker";
import Meuzan from "./Meuzan";
import TextField from "@mui/material/TextField";
import SaveIcon from "@mui/icons-material/Save";
import PsychologyIcon from "@mui/icons-material/Psychology";
import { AuthContext } from "../contexts/AuthContext";
import "firebase/compat/auth";
import domtoimage from "dom-to-image-improved";
import Button from "@mui/material/Button";
import Fab from "@mui/material/Fab";
import Switch from "@mui/material/Switch";
import ButtonGroup from "@mui/material/ButtonGroup";
import Grid from "@material-ui/core/Grid";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

const clg = require("crossword-layout-generator");

const Alert = forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Crossword() {
  const [showNameForPrint, setShowNameForPrint] = useState();
  const [editMode, setEditMode] = useState(true);
  const [imageIsReady, setImageIsReady] = useState(false);
  const [imageUrl, setImageUrl] = useState();
  const authContext = useContext(AuthContext);

  const navigate = useNavigate();

  let params = useParams();

  const theId = params.id;
  const [crossword, setCrossword] = useState();
  const [defs, setDefs] = useState();
  const [saveSucess, setSaveSucess] = useState(false);

  console.log("theId ", theId, " crossword", crossword);

  useEffect(() => {
    (async () => {
      console.log("@@@@@@@@");
      if (theId) {
        const record = await getCrossword(theId);
        const cw = modelToCrossword(record);
        const d = JSON.parse(JSON.stringify(cw?.defs || []));
        console.log("DDD got record ", d.length);
        setDefs(d);
        delete cw.defs;
        setCrossword(cw);
        setDefs(d);
      } else { 
        setDefs();
        setCrossword()
      }
    })();
  }, [theId]);

  const modelToCrossword = (model) => {
    const cw = JSON.parse(JSON.stringify(model));
    cw.table = resultToTable(model.result, model.cols, model.rows);
    cw.hints = cw.hints || [];
    cw.defs = cw.defs || [];
    console.log("cw is about ot be", cw);
    return cw;
  };

  function build() {
    const c = JSON.parse(JSON.stringify(crossword));
    c.hints = [];
    setCrossword(c);

    const d = (defs || textToDefs(crossword.textInput)).map(x=>({...x, answer: cleanAnswer(x.answer)}))
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
//    setDefs(d);
    setCrossword(m);
  }

  const makeDefsSpaceAware = (d) => {
    let defs = JSON.parse(JSON.stringify(d));
    console.log("!@!@ input", JSON.stringify(d));
    const additionalDefs = [];
    for (let i = 0; i < defs.length; i++) {
      const answer = defs[i].answer;
      const clue = defs[i].clue;
      defs[i].identifier = i;
      defs[i].subId = 0;
      defs[i].origAnswer = answer.replaceAll("~", " ").replaceAll("^", " ");
      defs[i].answer = answer.replaceAll("~", "").replaceAll("^", "");

      const words = defs[i].answer.split(" ");
      if (words.length > 1) {
        for (let j = 1; j < words.length; j++) {
          additionalDefs.push({
            clue,
            answer: words[j],
            identifier: i,
            origAnswer: answer,
            subId: j,
          });
        }
        defs[i].answer = words[0];
        defs[i].identifier = i;
      }
    }
    defs = defs.concat(additionalDefs);
    console.log("!@!@ w/o spaces it looks like ", defs);

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
            "~" +
            withoutSpace[defIndx].answer.slice(charIndx + 1);

          doGetBestLayout(
            withoutSpace,
            defIndx,
            charIndx + 1,
            "JOIN",
            spaces - 1
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

  function onDefsChange(d) {
    console.log("DDD onDefsChange  d:", d);
    setDefs(d);
    // const cw = JSON.parse(JSON.stringify(crossword || {}));
    // setCrossword(cw);
  }

  async function save() {
    d2i(false);
    const model = JSON.parse(JSON.stringify(crossword));
    model.defs = JSON.parse(JSON.stringify(defs));

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
      setSaveSucess(true);
    }
  }

  const updateHints = (pos) => {
    const c = JSON.parse(JSON.stringify(crossword));
    if (crossword.hints.includes(pos)) {
      c.hints = crossword.hints.filter((p) => p !== pos);
    } else {
      c.hints = crossword.hints.concat(pos);
    }
    setCrossword(c);
  };
  function showBoard(forPrint) {
    if (crossword && crossword.result) {
      return (
        <Board
          forPrint={!!forPrint}
          cols={crossword.cols}
          rows={crossword.rows}
          result={crossword.result}
          table={crossword.table}
          letters={crossword.hints}
          onLetter={(pos) => updateHints(pos)}
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
      return <Definitions defs={defs} onChange={onDefsChange}></Definitions>;
    }
  };

  const showBuildButton = () => {
    return crossword && defs?.length > 1;
  };

  const showSaveButton = () => {
    return editMode && crossword?.name?.trim()?.length > 0;
  };

  const d2i = async (forPrint) => {
    var node = document.getElementById("board-panel-print"); //crossword-grid-id-print");

    try {
      const dataUrl = await domtoimage.toPng(node);
      // console.log("d2i, dataUrl", dataUrl);
      if (!forPrint) {
        uploadScreenshot(theId, dataUrl);
      } else {
        console.log("d2i chnage imageToRead");
        setImageIsReady(true);
        setImageUrl(dataUrl);
      }
      return dataUrl;
    } catch (error) {
      console.error("oops, something went wrong!", error);
    }
  };

  const onModeChange = async () => {
    setEditMode(!editMode);
  };

  const showInfo = () => {
    return (
      <>
        <div className="info-thing">
          <TextField
            inputProps={{
              size: 40,
            }}
            autoComplete="off"
            size="small"
            label="שם"
            variant="standard"
            onChange={(x) => {
              const c = JSON.parse(JSON.stringify(crossword || {}));
              c.name = x.target.value;
              setCrossword(c);
            }}
            value={crossword?.name || ""}
            required
          />
          {theId && crossword?.result && (
            <>
              <TextField
                label="תאריך עדכון"
                variant="standard"
                disabled
                value={formatDate(
                  new Date(crossword?.updatedAt?.seconds * 1000 || Date.now)
                )}
              />

              <TextField
                label="תאריך יצירה"
                variant="standard"
                disabled
                value={formatDate(
                  new Date(crossword?.createdAt?.seconds * 1000 || Date.now)
                )}
              />
            </>
          )}

          <div className="save-build-buttons">
            <ButtonGroup
              variant="contained"
              aria-label="outlined primary button group"
            >
              <Button
                variant="contained"
                disabled={!showBuildButton()}
                onClick={build}
              >
                בנה
              </Button>

              <Button
                variant="contained"
                disabled={!showSaveButton()}
                onClick={save}
              >
                שמור
              </Button>
              <Button
                variant="contained"
                disabled={editMode}
                onClick={async () => {
                  setShowNameForPrint(true);
                  const u = await d2i(true);
                  var image = new Image();
                  image.src = u;

                  var w = window.open("");
                  w.document.write(image.outerHTML);
                  setShowNameForPrint(false);
                }}
              >
                הדפס
              </Button>
            </ButtonGroup>
          </div>

          <span className="switch-crossword-mode">
            <Grid component="label" container alignItems="center" spacing={1}>
              <Grid item>הדפסה</Grid>
              <Grid item>
                <Switch
                  checked={editMode}
                  onChange={() => onModeChange()}
                  name="loading"
                  color="primary"
                />
              </Grid>
              <Grid item>בניה</Grid>
            </Grid>
          </span>
        </div>
      </>
    );
  };

  const showClues = () => {
    if (crossword?.result) {
      return <Meuzan result={crossword.result}></Meuzan>;
    }
    return <></>;
  };

  const showSnack = () => {
    const handleClose=()=>{
      setSaveSucess(!saveSucess)
    }
    return (
      <>
        <Snackbar 
        open={saveSucess}
        anchorOrigin={{ vertical:'top', horizontal:'center' }}

         autoHideDuration={6000} onClose={handleClose}>
          <Alert
            onClose={handleClose}
            severity="success"
            sx={{ width: "100%" }}
          >
            התשבץ נשמר בהצלחה
          </Alert>
        </Snackbar>
      </>
    );
  };
  return (
    <>
      {!authContext.isLoggedIn ? (
        <h1>please login</h1>
      ) : (
        <>
          <div className="info-panel">
            {showInfo()}
            <hr></hr>
          </div>

          <div className={`main-panel ${!editMode ? "forPrint" : ""}`}>
            <div className="def-panel">{showDefinitions()}</div>
            <div className="board-panel" id="board-panel-print">
              {!editMode && showNameForPrint && crossword?.name}
              {showBoard(!editMode)}
              {showClues()}
              {!editMode && showNameForPrint && (
                <>
                  <br />
                  נוצר:
                  {formatDate(
                    new Date(crossword?.createdAt?.seconds * 1000 || Date.now)
                  )}
                  <br />
                  עודכן:
                  {formatDate(
                    new Date(crossword?.updatedAt?.seconds * 1000 || Date.now)
                  )}
                </>
              )}
            </div>
            {showSnack()}
          </div>
        </>
      )}
    </>
  );
}
