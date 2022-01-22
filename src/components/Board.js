//https://codepen.io/adrianroworth/pen/OpeyZq

export default function Board(props) {
  console.log("@@@@ in Board, props", props);
  const { cols, rows, table, result, onLetter, forPrint } = props;
  const letters = props.letters || [];
  console.log("forPrint", forPrint, "result", result);
  // console.log("table", table);
  // console.log("cols,rows", cols, rows);

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
          className="crossword-grid" 
          id={`crossword-grid-id${forPrint?"-print":""}`}
          style={{
            gridTemplateColumns: `repeat(${cols}, 50px)`,
            width: `${50 * cols + 2}px`,
            height: `${52 * rows}px`,
          }}
        >
          {Object.values(ROWS).map((r) => {
            return Object.values(COLS)
              .reverse()
              .map((c) => {
                const pos = `${r}-${c}`;
                const key = `item-${pos}`;
                if (c >= cols || r >= rows || table[r][c] === "-") {
                  return <span key={key} className="blank"></span>;
                } else {
                  const isHint = letters.includes(pos);

                  const label = result.find(
                    (d) => d.starty === r + 1 && d.startx === c + 1
                  );
                  return (
                    <span
                      onClick={() => !forPrint&&onLetter(pos)}
                      className={`item ${!forPrint && isHint ? "hint" : ""}`}
                      key={key}
                    >
                      {(!forPrint || isHint)?(table[r][c]):''}
                      {label && (
                        <span className="text label">{label.position}</span>
                      )}
                    </span>
                  );
                }
              });
          })}
        </div>
      </div>
    );
  };

  return <div className="crossword-board-container">{renderBoard()}</div>;
}
