// hubspot init
const hubspot = require("@hubspot/api-client")
const { CLIENT_ID, BASE_URL,SCOPES,CLIENT_SECRET } = process.env;
const REDIRECT_URL = `${BASE_URL}/oauth/callback`;

const express = require("express");

const bodyParser = require("body-parser");
const path = require("path");
const axios = require("axios");
const connectDb = require("./connection");

const Account = require("./Accounts.model");
const Faction = require("./Factions.model");
const userRouter = require("./Users.API");
const ideaRouter = require("./Ideas.API");

const app = express();
var apiRouter = express.Router();

app.use(bodyParser.json());

apiRouter.use("/users", userRouter);
apiRouter.use("/ideas", ideaRouter);
app.use("/api", apiRouter);

app.use(function(req, res, next) {
  res.status(404).send("The Web Service doesn't know what you are looking for");
});

app.use((err, req, res, next) => {
  res.status(500).send(err.toString());
});

console.log("process environment", process.env.NODE_ENV);
app.listen(process.env.PORT || 8080, () => {
  connectDb().then(() => {
    console.log("database connected");
  });
});




const initialSyncWithHubSpot = async accessToken => {
  await getAndSaveHubSpotContacts(accessToken);
  await setUpHubSpotProperties(accessToken);
};

const setUpHubSpotProperties = async accessToken => {
  console.log("Setting Up Properties");
  try {
    propertiesResponse = await axios.get(
      `http://hubspot_service:8080/api/properties/${accessToken}`
    );
  } catch (err) {
    console.log(err);
  }
};

const getAndSavehubSpotContacts = async accessToken => {
  console.log("Getting Contacts From HubSpot");
  try{
    hubspotContacts = await axios.get(
      `http://hubspot_service:8080/api/contacts/${accessToken}`
    )
  }catch (err){
    console.log(err);
  }

  for (const contact  of hubspotContacts.data){
    try{
      const user = await Users.findOneAndUpdate(
        { email: contact.properties.email },
        { hubspotContactId: contact.id }
      );
    }catch(err){
      console.log(err);
    }
  }
}

// asks user access to their hubspot account
const hubspotClient = new hubspot.Client();
app.get("/oauth/connect",async (req,res) => {
  const authorizationUrl = hubspotClient.oauth.getAuthorizationUrl(
    CLIENT_ID,
    REDIRECT_URL,
    SCOPES
  );

  res.redirect(authorizationUrl);
});


// complete the authorization flow with a call back from hubspot
app.get("/oauth/callback",async (req,res,next) => {
  const { code } = req.query;

  try {
    const tokenResponse =  await hubspotClient.oauth.defaultApi.createToken(
      "authorization_code",
      code,
      REDIRECT_URL,
      CLIENT_ID,
      CLIENT_SECRET
    );
    const { accessToken, refreshToken, expiresIn} = tokenResponse.body;
    const expiresAt = new Date(Date.now() + expiresIn);

    const accountInfo = await Account.findOneUpdate(
      { accountId:1 },
      { accessToken, refreshToken, expiresAt },
      { new: true, upsert: true }
    );
    await getAndSavehubSpotContacts(accessToken);
    
    res.redirect("/");
  }catch(err) {
    next(err);
  }
});



