import { createContext } from "react";

const AuthContext = createContext({
  isLoggedIn: false,
  userInfo: null,
  doLogin: () => {},
  doLogout: () => {},
});

export { AuthContext };
