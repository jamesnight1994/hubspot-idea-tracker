import React, { useState } from "react";
import {
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Link as MaterialLink
} from "@material-ui/core";
import { Menu } from "@material-ui/icons";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  Redirect
} from "react-router-dom";

import "./App.css";

import Home from "./Home/Home";

import SignUp from "./Users/SignUp";

import Login from "./Users/Login";

function App() {
  const [user, setUser] = useState({});
  const logOut = () => {
    setUser({});
  };
  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu">
            <Menu />
          </IconButton>
          <Typography className="full-width" variant="h6">
            <MaterialLink component={Link} to="/" style={{ color: "white" }}>
              Home
            </MaterialLink>
          </Typography>
          <Typography className="full-width" variant="h6">
            <MaterialLink href="/oauth/connect" style={{ color: "white" }}>
              Connect to HS
            </MaterialLink>
          </Typography>
          {user.email ? (
            <Button onClick={logOut}>
              <Typography>{user.firstName + " " + user.lastName}</Typography>
            </Button>
          ) : (
            <MaterialLink
              component={Link}
              to="/login"
              style={{ color: "white" }}
            >
              <Button color="inherit">Login</Button>
            </MaterialLink>
          )}
        </Toolbar>
      </AppBar>
      <Switch>
        <Route path="/login">
          <Login setUser={setUser} />
        </Route>
        <Route path="/signup">
          <SignUp setUser={setUser} />
        </Route>
        {Object.entries(user).length === 0 && user.constructor === Object ? (
          <Redirect to="/login" />
        ) : (
          <Route path="/">
            <Home user={user} />
          </Route>
        )}
      </Switch>
    </Router>
  );
}

export default App;