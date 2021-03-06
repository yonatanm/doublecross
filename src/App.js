import "./App.scss";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Crossword from "./components/Crossword";
import AllCrosswords from "./components/AllCrosswords";
import { useNavigate } from "react-router-dom";
import ResponsiveAppBar from "./components/Menu";

import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { AuthContext } from "./contexts/AuthContext";

import { useState, useContext } from "react";
import { firebase } from "./Firebase";

// Create rtl cache
const cacheRtl = createCache({
  key: "muirtl",
  stylisPlugins: [rtlPlugin],
});

function RTL(props) {
  return <CacheProvider value={cacheRtl}>{props.children}</CacheProvider>;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const authContext = useContext(AuthContext);

  const doLogin = (ui) => {
    setIsLoggedIn(true);
    setUserInfo(ui);
    console.log("do login :-) ", ui);
  };
  const doLogout = () => {
    console.log("do logout :-(");
    setIsLoggedIn(false);
    setUserInfo({});
    firebase.auth().signOut();
  };

  return (
    <>
      <div id="image-placeholder"></div>
      <AuthContext.Provider value={{ isLoggedIn, doLogin, doLogout, userInfo }}>
        <RTL>
          <Router basename="/doublecross/">
            <ResponsiveAppBar></ResponsiveAppBar>

            {isLoggedIn && (
              <div>
                <Routes>
                  <Route path="/crossword" element={<Crossword />} />
                  <Route exact path="/crosswords" element={<AllCrosswords />} />
                  <Route path="/crosswords/:id" element={<Crossword />} />
                  <Route exact path="/" element={<AllCrosswords />} />
                </Routes>
              </div>
            )}
          </Router>
        </RTL>
      </AuthContext.Provider>
    </>
  );
}

export default App;
