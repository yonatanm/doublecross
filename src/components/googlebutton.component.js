import { useContext, useState } from "react";
import { GoogleLogin, GoogleLogout } from "react-google-login";
import { AuthContext } from "../contexts/AuthContext";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";

const CLIENT_ID =
  "48915359066-6tl28mb2n96e12qhio7qeqktcbsrf3jb.apps.googleusercontent.com";

export default function GoogleLoginComponent(props) {
  const { isLoggedIn, userInfo, doLogin, doLogout } = useContext(AuthContext);
  const { btn } = props;

  // Success Handler
  const responseGoogleSuccess = (response) => {
    // console.log("resp", response);
    let userInfo = {
      name: response.profileObj.name,
      email: response.profileObj.email,
      avatar: response.profileObj.imageUrl,
    };
    console.log("about to doLogin ", userInfo);
    doLogin(userInfo);
  };

  // Error Handler
  const responseGoogleError = (response) => {
    console.log("responseGoogleError", response);
  };

  // Logout Session and Update State
  const logout = (response) => {
    console.log("logout", response);
    doLogout();
  };

  if (isLoggedIn)
    return (
      <GoogleLogout
        clientId={CLIENT_ID}
        render={(renderProps) => (
          <Tooltip title={`לחץ כדי להתנתק, ${userInfo?.name}`}>
            <IconButton onClick={renderProps.onClick} sx={{ p: 0 }}>
              <Avatar alt={userInfo?.name} src={userInfo?.avatar} />
            </IconButton>
          </Tooltip>
        )}
        buttonText="Logout"
        onLogoutSuccess={logout}
      />
    );

  if (btn) return (
    <GoogleLogin
      clientId={CLIENT_ID}      
      onSuccess={responseGoogleSuccess}
      onFailure={responseGoogleError}
      buttonText="לחץ כדי להתחבר"
      isSignedIn={true}
      cookiePolicy={"single_host_origin"}
    />
  );

  return (
    <GoogleLogin
      clientId={CLIENT_ID}
      render={(renderProps) => (
        <Tooltip title="לחץ כדי להתחבר">
          <IconButton onClick={renderProps.onClick} sx={{ p: 0 }}>
            <Avatar alt="XX" src={undefined} />
          </IconButton>
        </Tooltip>
      )}
      buttonText="Login"
      onSuccess={responseGoogleSuccess}
      onFailure={responseGoogleError}
      isSignedIn={true}
      cookiePolicy={"single_host_origin"}
    />
  );
}
