import { TripOriginSharp } from "@material-ui/icons";

export default function Meuzan(params) {
  const result = params.result;
  console.log("!@ Meuzan with result", result);
  function extractHor(orient) {
    return result.filter((d) => d.orientation === orient);
  }
  function renderSize(d) {
    const words = d.origAnswer || d.answer;

    return `(${words
      .split(" ")
      .map((w) => w.length)
      .join(",")})`;
  }

  const renerReference = (r) => {
    return (
      <span >
        {r.position} {r.orientation !== "across" ? "מאוזן" : "מאונך"}
      </span>
    );
  };
  const renerClue = (d) => {
    const siblings = result
      .filter((dd) => dd.identifier === d.identifier)
      .sort((a, b) => a.position - b.position);
    let theOrigin = siblings.filter((dd) => dd.subId === 0)[0];
    if (siblings.length === 1) {
      // i.e. I'm alone
      return (
        <span>
          {d.clue} {renderSize(d)}{" "}
        </span>
      );
    }
    if (d.subId === 0) {
      return (
        
        <span>
          {d.clue} {`{`} {renderSize(d)} יחד עם{" "}
          {siblings
            .filter((s) => s.subId > 0)
            .map((s, i) => {
              return (<span key={s.subId}>{i>0?"ו":""}{renerReference(s)}</span>)
            })} {`}`}
        </span>
      );
    }
    return (
      <span>
        ראה {renerReference(theOrigin)}
      </span>
    );
  };
  function renderHor(orient) {
    if (!result) return <></>;
    return (
      <div>
        {extractHor(orient).map((d) => {
          return (
            <div key={d.position}>
              <span className="position">{d.position}. </span>
              <span className="clue">{renerClue(d)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <h1>מאוזן</h1>
      <div>{renderHor("across")}</div>
      <h1>מאונך</h1>
      <div>{renderHor("down")}</div>
    </div>
  );
}
