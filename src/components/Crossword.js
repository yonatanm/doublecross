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
import PrintIcon from '@mui/icons-material/Print';
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
import IconButton from '@mui/material/IconButton';
import Print from "@mui/icons-material/Print";

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
  const [theUIDefs, setTheUIDefs] = useState();
  const [saveSucess, setSaveSucess] = useState(false);
  const [history, setHistory] = useState({ index: -1, defs: [], crosswords: [] })

  console.log("theId ", theId, " crossword", crossword);

  useEffect(() => {
    (async () => {
      console.log("@@@@@@@@");
      if (theId) {
        const record = await getCrossword(theId);
        const cw = modelToCrossword(record);
        const d = JSON.parse(JSON.stringify(cw?.defs || []));
        console.log("DDD got record ", d.length);
        delete cw.defs;
        setCrossword(cw);
        setDefs(d);
        setTheUIDefs(d)

        history.index = 0
        history.defs.push(d)
        history.crosswords.push(cw)
        setHistory({ index: 0, defs: [d], crosswords: [cw] })

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

  function build(next) {
    if (!next) {
      setCrossword(history.crosswords[history.index - 1])
      setDefs(history.defs[history.index - 1])
      setTheUIDefs(history.defs[history.index - 1])
      history.index--
      setHistory(history)
      return
    }
    if (history.index >= 0 && history.crosswords[history.index + 1]) {
      setCrossword(history.crosswords[history.index + 1])
      setDefs(history.defs[history.index + 1])
      setTheUIDefs(history.defs[history.index + 1])
      history.index++
      setHistory(history)
      return
    }

    const c = JSON.parse(JSON.stringify(crossword));
    c.hints = [];
    setCrossword(c);

    const d = defs.map(x => ({ ...x, answer: cleanAnswer(x.answer) }))
    let { candidate, r } = getBestLayout(d)
    let m;
    const maxTries = 5;
    while (true) {
      let o = getBestLayout(d);
      candidate = o.candidate
      r = o.r
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

      m = JSON.parse(JSON.stringify(crossword));
      m.result = JSON.parse(JSON.stringify(_layout.result));
      m.table = t;
      m.cols = _layout.cols;
      m.rows = _layout.rows;
      m.leftOut = JSON.parse(JSON.stringify(leftOut));
      if (history.index <= 0) break;
      if (JSON.stringify(m) !== JSON.stringify(history.crosswords[history.index])) break;
      if (!--maxTries) break;
    }
    setCrossword(m);

    console.log("HHH", history);
    const ii = history.index + 1
    history.defs.push(d)
    history.crosswords.push(m)
    history.index = ii
    setHistory(history)
  }

  const makeDefsSpaceAware = (d) => {
    let spaceAwareD = JSON.parse(JSON.stringify(d));
    console.log("!@!@ input", JSON.stringify(d));
    const additionalDefs = [];
    for (let i = 0; i < spaceAwareD.length; i++) {
      const answer = spaceAwareD[i].answer;
      const clue = spaceAwareD[i].clue;
      spaceAwareD[i].identifier = i;
      spaceAwareD[i].subId = 0;
      spaceAwareD[i].origAnswer = answer.replaceAll("^", " ");
      spaceAwareD[i].answer = answer.replaceAll(" ", "")

      const words = spaceAwareD[i].answer.split("^");
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
        spaceAwareD[i].answer = words[0];
        spaceAwareD[i].identifier = i;
      }
    }
    spaceAwareD = spaceAwareD.concat(additionalDefs);
    console.log("!@!@ w/o spaces it looks like ", spaceAwareD);

    return spaceAwareD;
  };


  const getBestLayout = (defs) => {

    const shuffle = (arr) => {
      let currentIndex = arr.length, randomIndex;
      while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [arr[currentIndex], arr[randomIndex]] = [
          arr[randomIndex], arr[currentIndex]];
      }

      return arr;
    }

    const defSpaceAware = makeDefsSpaceAware(JSON.parse(JSON.stringify(defs)));

    let candidate = shuffle(defSpaceAware)
    return { candidate, r: -1 };
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
    console.log("CCCCC onDefsChange  d:", d, "defs", defs);
    if (!defs || d.some((e, i) => d[i].answer.trim() !== defs[i]?.answer?.trim())) {
      setDefs(d);
      setHistory({ index: -1, defs: [], crosswords:[] })
    }
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
      return <></>
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
      return <Definitions showAddDef={crossword?.name?.trim()?.length && editMode} defs={theUIDefs} onChange={onDefsChange}></Definitions>;
    }
  };

  const showNextButton = () => {
    return crossword && defs?.length > 1 && editMode && crossword?.name?.trim()?.length > 0;
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
          </div>

          <span className="switch-crossword-mode">
          <Grid component="label" container alignItems="center" spacing={1}>

          <Button
                variant="contained"
                disabled={!showSaveButton()}
                onClick={save}
                startIcon={<SaveIcon />}

              >
                שמור
              </Button>
            &nbsp;&nbsp;&nbsp;

            <ButtonGroup
              variant="contained"
              aria-label="outlined primary button group"
            >
              <Button
                variant="contained"
                disabled={!showNextButton() || history.index <= 0}
                onClick={() => build(false)}
              >
                &lt;&lt;
              </Button>
              <Button
                variant="contained"
                disabled={!showNextButton()}
                onClick={() => build(true)}
              >
                &gt;&gt;
              </Button>
            </ButtonGroup>            
          
              &nbsp;&nbsp;&nbsp;
            <Button
              startIcon={<Print />}
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
              </Button>              <Grid item>
                <Switch
                  checked={editMode}
                  onChange={() => onModeChange()}
                  name="loading"
                  color="primary"
                />
              </Grid>
              <Grid item>עריכה</Grid>
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
    const handleClose = () => {
      setSaveSucess(!saveSucess)
    }
    return (
      <>
        <Snackbar
          open={saveSucess}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}

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
              <h1 className="crossword-name-print">{!editMode && showNameForPrint && crossword?.name}</h1>
              {showBoard(!editMode)}
              {showClues()}
              {!editMode && showNameForPrint && (
                <>
                  <hr />
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
