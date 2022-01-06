import { useState, useEffect } from "react";

const DEFAULT_TEXT = `CLUE1 - איתמר
CLUE2 - רותמ
CLUE3 - גוני
CLUE4 - ענבר 
CLUE5 - אולי
CLUE6 - לוטמ
CLUE7 - סיני
CLUE8 - שקד
CLUE9 - גורי`;

function Definitions(params) {
  console.log(`in DDD text=[${params.text}] def=[${!!params.defs}]`);
  const [text, setText] = useState(
    params.text || defsToText(params.defs) || DEFAULT_TEXT
  );

  useEffect(() => {
    console.log("update 1st!!!....");
    params.onChange(textToDefs(text), text);
  }, []);

  // useEffect(() => {
  //   console.log('update....')
  //   setText(defsToText(params.defs) || DEFAULT_TEXT)
  // },[]);

  const onTextAreaChange = (event) => {
    handleChange(event.target.value);
  };

  const handleChange = (newText) => {
    const defsBefore = textToDefs(text);
    const defsAfter = textToDefs(newText);
    setText(newText);
    if (JSON.stringify(defsBefore) !== JSON.stringify(defsAfter)) {
      console.log("there is a chnage in defs");
      params.onChange(defsAfter, newText);
    }
  };

  return <textarea value={text} onChange={onTextAreaChange}></textarea>;
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
  if (!t) return [];
  var wordList = t
    .replace(/[\r\n:-]+/g, "~").split("~").map((x) => x.trim()).filter((x) => x.length > 0);
  const defs = [];
  for (let i = 0; i < wordList.length; i += 2) {
    const answer = cleanAnswer(wordList[i]);
    console.log('cleaning', wordList[i], answer)
    defs.push({ clue: wordList[i+1], answer });
  }
  console.log('in textToDefs', t, defs)
  return defs;
};

const cleanAnswer = (a) => {
  const noDblSpaces = (a||'').split(" ").map(x=>x.trim()).filter(x=>x.length>0).join(" ")
  const noLastLetters = noDblSpaces.split('')
    .map((x) => (x === "ם" ? "מ" : x))
    .map((x) => (x === "ן" ? "מ" : x))
    .map((x) => (x === "ך" ? "כ" : x))
    .map((x) => (x === "ף" ? "פ" : x))
    .map((x) => (x === "ץ" ? "צ" : x)).join('')
  return noLastLetters;
};
export { Definitions, defsToText, textToDefs };
