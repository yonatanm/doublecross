import "./App.scss";

import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";


import Crossword from "./components/Crossword";
import AllCrosswords from "./components/AllCrosswords";

function App() {
  

  return (
    <Router>
      <div dir='rtl'>
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/crossword">New</Link>
            </li>            
            <li>
              <Link to="/crosswords">all</Link>
            </li>
          </ul>
        </nav>

        {/* A <Switch> looks through its children <Route>s and
          renders the first one that matches the current URL. */}
        <Routes>
          <Route path="/crossword" element={<Crossword />} />
          <Route exact path="/crosswords" element={<AllCrosswords />} />
          <Route path="/crosswords/:id" element={<Crossword />} />
          <Route exact path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}

function Home() {
  return (
    <div>
      <h1>DoubleCrossברוך הבא ל</h1>
      {/* <Outlet/> */}
    </div>
  );
}
export default App;
