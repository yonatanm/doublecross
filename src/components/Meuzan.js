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
      .reverse()
      .map((w) => w.length)
      .join(",")})`;
  }

  const renerReference = (r) => {
    return (
      <span>
        {r.position} {r.orientation === "across" ? "מאוזן" : "מאונך"}
      </span>
    );
  };

  const renderRefrences = (siblings) => {
    const refs = siblings.filter((s) => s.subId > 0);
    return refs.map((s, i) => {
      return (
        <span key={s.subId}>
          {i > 0 ? ", " : ""}
          {renerReference(s)}
        </span>
      );
    });
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
          (יחד עם  {renderRefrences(siblings)}) {d.clue}
          {renderSize(d)}        
        </span>
      );
    }
    return <span>ראה {renerReference(theOrigin)}</span>;
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
    <div className="rendered-definitions">
      <div className="across-def">
        <h3>מאוזן</h3>
        {renderHor("across")}
      </div>
      <div className="down-def">
        <h3>מאונך</h3>
        {renderHor("down")}
      </div>
    </div>
  );
}
