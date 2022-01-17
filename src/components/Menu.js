import { useState, useEffect, useContext } from "react";

import { styled, alpha } from "@mui/material/styles";
import InputBase from "@mui/material/InputBase";
import Modal from "@mui/material/Modal";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import { AuthContext } from "../contexts/AuthContext";
import { SignInScreen } from "../components/googlebutton.component";
const pages = [
  {
    title: "התשבצים שלי",
    dest: "/crosswords",
  },
  { title: "תשבץ חדש", dest: "/crossword" },
];


const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(1),
    width: "auto",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      width: "12ch",
      "&:focus": {
        width: "20ch",
      },
    },
  },
}));

const ResponsiveAppBar = () => {
  const [open, setOpen] = useState(false);

  const { doLogout, isLoggedIn, userInfo } = useContext(AuthContext);

  const handleClose = () => setOpen(false);

  const navigate = useNavigate();

  const handleCloseNavMenu = (dest) => {
    navigate(dest);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
       
      </Modal>
      <AppBar position="static">
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <Typography
              variant="h5"
              noWrap
              component="div"
              sx={{ mr: 2, display: { xs: "none", md: "flex" } }}
            >
              אחד מאוזן
            </Typography>

            <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
              {pages.map((page) => (
                <Button
                  key={page.dest}
                  onClick={() => handleCloseNavMenu(page.dest)}
                  sx={{ my: 2, color: "white", display: "block" }}
                >
                  {page.title}
                </Button>
              ))}
            </Box>

            <SignInScreen></SignInScreen>

            <Box sx={{ flexGrow: 0 }}>
              {/* <GoogleLoginComponent /> */}
              {console.log("userInfo", userInfo)}
              {isLoggedIn && (
                <Tooltip title={`לחץ כדי להתנתק, ${userInfo?.name}`}>
                  <IconButton
                    onClick={() => {
                      doLogout();
                      navigate("/");
                    }}
                    sx={{ p: 0 }}
                  >
                    <Avatar alt={userInfo?.name} src={userInfo?.avatar} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* 
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search…"
              inputProps={{ "aria-label": "search" }}
            />
          </Search> */}
          </Toolbar>
        </Container>
      </AppBar>
    </>
  );
};
export default ResponsiveAppBar;
