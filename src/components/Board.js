export default function Board(props) {
  const cols = props.layout.cols;
  const rows = props.layout.rows;
  const result = props.layout.table;
  console.log(`** layout ${cols}X${rows} **`, result);
  const onChange = (event) => {
    return;
  };
  const line=[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  const renderBoard = () => {
    return (
      <div>
        <div className="crossword-board">
          {line.map((r) => {
            return line.map((c) => {
            let cc = parseInt(c)+1
            let id = `item${r+1}-${cc}`
            console.log(`id`, id)
            
            if (c>=cols || r>=rows || result[r][c] === "-") {
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
                  value=""
                  onChange={onChange}
                />
              );
            }
          })})}
        </div>

        <div className="crossword-board crossword-board--labels">
          <span className="crossword-board__item-label-text">1</span>
        </div>
      </div>
    );
  };

  return <div className="crossword-board-container">{renderBoard()}</div>;
}
