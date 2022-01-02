export default function Board(props) {
  const { cols, rows, table, result } = props.layout;
  console.log(`** layout ${cols}X${rows} **`, props.layout.result);
  const onChange = (event) => {
    return;
  };
  const line = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const lineC =  [12,11,10,9,8,7,6,5,4,3,2,1,0]

  const renderBoard = () => {
    return (
      <div>
        <div className="crossword-board">
          {line.map((r) => {
            return lineC.map((c) => {
              let cc = (parseInt(c) + 1);
              let id = `item${r + 1}-${cc}`;
              // console.log(`id`, id);
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
                    onChange={onChange}
                  />
                );
              }
            });
          })}
        </div>

        <div className="crossword-board crossword-board--labels">
          {Object.keys(result).map((i) => {
            const d= result[i]
            let id = `lable-${parseInt(i)}`;
            console.log('label-id:', id,'position:', d.position, 'x:', d.startx, ' y:', d.starty)
            return (
                <span
                  id={id}
                  key={id}
                  className="crossword-board__item-label"
                  style={{
                    gridColumn: `${14-d.startx}/${14-d.startx}`,
                    gridRow: `${d.starty}/${d.starty}`,
                  }}
                > <span className="crossword-board__item-label-text">{d.position}</span>
                </span>
            );
          })}
        </div>
      </div>
    );
  };

  return <div className="crossword-board-container">{renderBoard()}</div>;
}
