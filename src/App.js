import "./App.scss";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import Crossword from "./components/Crossword";
import AllCrosswords from "./components/AllCrosswords";
import Fab from "@mui/material/Fab";
import AddIcon from "@material-ui/icons/Add";
import { useNavigate } from "react-router-dom";
import SearchAppBar from "./components/Menu";
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
// import { create } from 'jss';
// import rtl from 'jss-rtl';
// import { StylesProvider, jssPreset } from '@mui/styles';
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  direction: "rtl",
});

// const jss = create({
//   plugins: [...jssPreset().plugins, rtl()],
// });

// Create rtl cache
const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [rtlPlugin],
});

function RTL(props) {
  return <CacheProvider value={cacheRtl}>{props.children}</CacheProvider>;
  // return <></>
}

// function RTL(props) {
//   return <StylesProvider jss={jss}>{props.children}</StylesProvider>;
// }

function App() {
  return (
    <RTL>
      {/* <ThemeProvider theme={theme}> */}
      <Router>
        <SearchAppBar> </SearchAppBar>
        <div>
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
      {/* </ThemeProvider> */}
    </RTL>
  );
}

function Home() {
  const navigate = useNavigate();
  const gotoNew = () => {
    navigate(`/crossword`);
  };
  return (
    <div>
      <Fab color="primary" aria-label="add" onClick={gotoNew}>
        <AddIcon />
      </Fab>

      <h1>DoubleCrossברוך הבא ל</h1>
      {/* <Outlet/> */}
    </div>
  );
}
export default App;
