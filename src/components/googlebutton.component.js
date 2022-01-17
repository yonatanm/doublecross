import { useContext, useEffect } from "react";
import { AuthContext } from "../contexts/AuthContext";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";

import StyledFirebaseAuth from "react-firebaseui/StyledFirebaseAuth";
import { firebase } from "../Firebase";
import "firebase/compat/auth";

const uiConfig = {
  signInFlow: "popup",
  signInOptions: [firebase.auth.GoogleAuthProvider.PROVIDER_ID],
  callbacks: {
    signInSuccessWithAuthResult: () => false,
  },
};

function SignInScreen() {
  const { isLoggedIn, userInfo, doLogin, doLogout } = useContext(AuthContext);

  // Listen to the Firebase Auth state and set the local state.
  useEffect(() => {
    const unregisterAuthObserver = firebase
      .auth()
      .onAuthStateChanged((user) => {
        console.log(
          "!!! user",
          user,
          "firebase user",
          firebase.auth().currentUser
        );
        if (!user) {
          doLogout();
        } else {
          doLogin({
            name: user.multiFactor.user.displayName,
            email: user.multiFactor.user.email,
            avatar: user.multiFactor.user.photoURL,
            uid: user.multiFactor.user.uid,
          });
        }
      });
    return () => unregisterAuthObserver(); // Make sure we un-register Firebase observers when the component unmounts.
  }, []);

  if (!isLoggedIn) {
    return (
        <StyledFirebaseAuth
          render={(renderProps) => (
            <Tooltip title="לחץ כדי להתחבר">
              <IconButton onClick={renderProps.onClick} sx={{ p: 0 }}>
                <Avatar alt="XX" src={undefined} />
              </IconButton>
            </Tooltip>
          )}
          uiCallback={(ui) => ui.disableAutoSignIn()}
          uiConfig={uiConfig}
          firebaseAuth={firebase.auth()}
        />
    );
  } return <></>
}

export { SignInScreen };
