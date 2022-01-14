//https://codepen.io/adrianroworth/pen/OpeyZq

export default function Board(props) {
  console.log("@@@@ in Board, props", props);
  const { cols, rows, table, result, onLetter } = props;
  const letters = props.letters||[]
  console.log("result", result);
  console.log("table", table);
  console.log("cols,rows", cols, rows);

  const ROWS = [];
  for (let i = 0; i < rows; i++) {
    ROWS.push(i);
  }

  const COLS = [];
  for (let i = 0; i < cols; i++) {
    COLS.push(i);
  }

  const renderBoard = () => {
    return (
      <div>
        <div
          className="crossword-grid" id='crossword-grid-id'
          style={{
            gridTemplateColumns: `repeat(${cols}, 50px)`,
            width: `${50 * cols}px`,
            height: `${50 * rows}px`,
          }}
        >

<div
            className="crossword-grid labels-container"
            style={{
              width: `${50 * cols}px`,
              height: `${50 * rows}px`,
              gridTemplateColumns: `repeat(${cols}, 50px)`,
              gridTemplateRows: `repeat(${rows}, 50px)`,
            }}
          >
            {Object.keys(result).map((i) => {
              const d = result[i];
              let key = `lable-${i}`;
              const x = d.origStartx;
              return (
                <span
                  key={key}
                  className="label"
                  style={{
                    gridArea: `${d.starty}/${x}`,
                  }}
                >
                  <span className="text">{d.position}</span>
                </span>
              );
            })}
          </div>

          {Object.values(ROWS).map((r) => {
            return Object.values(COLS)
              .reverse()
              .map((c) => {
                const pos = `${r}-${c}`
                const key = `item-${pos}`;
                if (c >= cols || r >= rows || table[r][c] === "-") {
                  return <span key={key} className="blank"></span>;
                } else {
                  const isHint = letters.includes(pos)
                  return (
                    <input
                      key={key}
                      className={`item ${isHint? "hint" :""}`}
                      minLength="1"
                      maxLength="1"
                      onClick={()=>onLetter(pos)}
                      readOnly
                      value={table[r][c]}
                    />
                  );
                }
              });
          })}

         
        </div>
      </div>
    );
  };

  return (
    <div className="crossword-board-container">
      {renderBoard()}
    </div>
  );
}
