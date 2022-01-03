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
  console.log(`in DDD text=[${params.text}] def=[${!!params.defs}]`)
  const [text, setText] = useState(params.text || defsToText(params.defs) || DEFAULT_TEXT);


  useEffect(() => {
    console.log('update 1st!!!....')
    params.onChange(textToDefs(text), text);
  },[]);

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
    .replace(/[ \r\n,;:-]+/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  const defs = [];
  for (let i = 0; i < wordList.length; i += 2) {
    defs.push({ clue: wordList[i], answer: wordList[i + 1] });
  }
  return defs;
};
export { Definitions, defsToText, textToDefs };
