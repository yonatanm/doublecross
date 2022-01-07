export default function Meuzan(params) {
  const result = params.result;
  console.log('!@ Meuzan with result', result)
  function extractHor(orient) {
    return result.filter((d) => d.orientation === orient);
  }
  function renderSize(d, id){
    const words = result[id].answer
    return `(${words.split(" ").map((w)=>w.length).join(",")})`
  }

  function renderHor(orient) {
    return (
      <div>
        {extractHor(orient).map((d, i) => {
          return (
            <div key={d.position}>
              <span className="position">{d.position}. </span>
              <span clasName="clue">{d.clue} {renderSize(d, i)}
                </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <h1>מאוזן</h1>
      <div>{renderHor('across')}</div>
      <h1>מאונך</h1>
      <div>{renderHor('down')}</div>
    </div>
  );
}
