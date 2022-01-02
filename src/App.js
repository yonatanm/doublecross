import "./App.scss";

import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import { db, getCrosswords } from "./Firebase";

import Crossword from "./components/Crossword";
import { useEffect } from "react";

 function App() {
  useEffect(() => {
    (async () => {
      await getCrosswords(db);
    })();
  }, []);

  return (
    <Router>
      <div>
          <nav>
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/crossword">News</Link>
              </li>
              <li>
                <Link to="/crosswords">all</Link>
              </li>
            </ul>
          </nav>

        {/* A <Switch> looks through its children <Route>s and
          renders the first one that matches the current URL. */}
        <Routes>
          <Route exact path="/crossword" element={<Crossword />} />
          <Route exact path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}

function Home() {
  return <h1>DoubleCrossברוך הבא ל</h1>;
}
export default App;
