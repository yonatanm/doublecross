//https://codepen.io/adrianroworth/pen/OpeyZq

const LINE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export default function Board(props) {
  console.log("@@@@ in Board, props", props);
  const { cols, rows, table, result } = props;
console.log("result", result)
  const renderBoard = () => {
    return (
      <div>
        <div className="crossword-board">
          {Object.values(LINE).map((r) => {
            return Object.values(LINE).reverse().map((c) => {
              let cc = parseInt(c) + 1;
              let id = `item${r + 1}-${cc}`;
              if (c >= cols || r >= rows || table[r][c] === "-") {
                return (
                  <span
                    id={id}
                    key={id}
                    className="crossword-board__item--blank"
                  ></span>
                );
              } else {
                return (
                  <input
                    id={id}
                    key={id}
                    className="crossword-board__item"
                    type="text"
                    minLength="1"
                    maxLength="1"
                    required="required"
                    value={table[r][c]}
                    onChange={()=>{}}
                  />
                );
              }
            });
          })}
        </div>

        <div className="crossword-board crossword-board--labels">
          {Object.keys(result).map((i) => {
            const d = result[i];
            let id = `lable-${parseInt(i)}`;
            const x = cols+5-d.startx
            // const x = d.origStartx
            return (
              <span
                id={id}
                key={id}
                className="crossword-board__item-label"
                style={{
                  gridColumn: `${x}/${x}`,
                  gridRow: `${d.starty}/${d.starty}`,
                }}
              >
                {" "}
                <span className="crossword-board__item-label-text">
                  {d.position}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return <div className="crossword-board-container">{renderBoard()}</div>;
}
