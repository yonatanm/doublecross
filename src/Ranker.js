const WEIGHTS = [2, 100, 0.2, 0.2];
const SUM_WEIGHTS = WEIGHTS.reduce((acc, v) => acc + v, 0);

const rankCrossword = (result, table) => {
  function calcInteraction() {
    let num = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (table[i][j] === "-") continue;
        let up = i > 0 && table[i - 1][j] !== "-";
        let down = i < rows - 1 && table[i + 1][j] !== "-";

        let left = j > 0 && table[i][j - 1] !== "-";
        let right = j < cols - 1 && table[i][j + 1] !== "-";
        num += (up || down) && (left || right) ? 1 : 0;
      }
    }
    return num;
  }

  const rows = table.length;
  const cols = table[0].length;
  const wordsRatio =
    result.filter((d) => d.orientation !== "none").length / result.length;
  const tableAsLongLine = table.reduce((acc, l) => {
    return acc.concat(l);
  }, []);
  const numOfLetters = tableAsLongLine.filter((l) => l !== "-").length;
  const fillRatio = numOfLetters / (rows * cols);
  const dimRatio = Math.min(rows, cols) / Math.max(rows, cols, 1);
  const numOfIntersections = calcInteraction();

  const noZombies = result
    .filter((d) => d.orientation === "none")
    .every(
      (d) => result.filter((otherD) => otherD.clue === d.clue).length === 1
    );

  const intersectionsRatio = numOfIntersections / result.length;
  const factors = [wordsRatio, intersectionsRatio, fillRatio, dimRatio];

  const rank =
    ((noZombies ? 1 : 0) *
      factors.reduce((acc, val, i) => acc + val * WEIGHTS[i], 0)) /
    SUM_WEIGHTS;

  return rank;
};

export { rankCrossword };
