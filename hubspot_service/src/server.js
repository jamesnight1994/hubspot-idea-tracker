// hubspot init
const hubspot = require("@hubspot/api-client")

const express = require("express");
const bodyParser = require("body-parser");
const ideaRouter = require("../../web_service/src/Ideas.API");

const app = express();
var apiRouter = express.Router();

app.use(bodyParser.json());

app.use("/api", apiRouter);

app.use((err, req, res, next) => {
  res.status(500).send(err.toString());
});

console.log("process environment", process.env.NODE_ENV);
app.listen(process.env.PORT || 8080, () => {});

const hubspotClient = new hubspot.Client();

apiRouter.post("/timeline/:accessToken", async (req, res, next) => {
  const { idea } = req.body;
  const { accessToken } = req.params;
  hubspotClient.setAccessToken(accessToken);
  const timelineEvent = {
    eventTemplateId: "1003035",
    objectId: idea.author.hubspotContactId,
    tokens: {
      idea_title: idea.title,
      idea_detail: idea.detail,
    },
  };
  console.log("sending timeline event", timelineEvent);
  try {
    await hubspotClient.crm.timeline.eventsApi.create(timelineEvent);
    res.send("ok");
  } catch (err) {
    console.log(err);
    next(err);
  }
});

apiRouter.get("/contacts/:accessToken", async (req, res, next) => {
  const { accessToken } = req.params;
  hubspotClient.setAccessToken(accessToken);

  try {
    const getAllContacts = async (offset, startingContacts) => {
      const pageOfContacts = await hubspotClient.crm.contacts.basicApi.getPage(
        100,
        offset
      );

      const endingContacts = startingContacts.concat(
        pageOfContacts.body.results
      );

      if (pageOfContacts.body.paging) {
        return await getAllContacts(
          pageOfContacts.body.paging.next.after,
          endingContacts
        );
      } else {
        return endingContacts;
      }
    };
    const allContacts = await getAllContacts(0, []);

    res.status(200).send(allContacts);
  } catch (err) {
    next(err);
  }
});

apiRouter.get("/properties/:accessToken",(req,res,next) => {
  const { accessToken } = req.params;
  const propertyGroupInfo = {
    name: "ideatrackergroup",
    displayOrder: -1,
    label: "Idea Tracker Group"
  };
  const createProperty = async groupName => {
    const inputs = [
      {
        groupName,
        type: "number",
        label: "Number of Ideas Submitted",
        fieldType: "number",
        name: "num_ideas_submitted"
      },
      {
        groupName,
        type: "string",
        label: "Faction Rank",
        fieldType: "string",
        name: "faction_rank"
      }
    ];
    try {
      return await hubspotClient.crm.properties.batchApi.createBatch(
        "contacts",
        {
          inputs
        }
      );
    } catch (err) {
      next(err);
    }
  };
  hubspotClient.setAccessToken(accessToken);
  const checkForPropInfo = async () => {
    const existingPropertyGroups = await hubspotClient.crm.properties.groupsApi.getAll(
      "contacts"
    );

    const groupExists = existingPropertyGroups.body.results.find(
      group => group.name === propertyGroupInfo.name
    );
    if (groupExists) {
      const getAllExistingProperties = async (startingProperties, offset) => {
        const pageOfProperties = await hubspotClient.crm.properties.coreApi.getAll(
          "contacts",
          false,
          { offset }
        );
        const endingProperties = startingProperties.concat(
          pageOfProperties.body.results
        );
        if (pageOfProperties.body.paging) {
          return await getAllExistingProperties(
            endingProperties,
            pageOfProperties.body.page.next.after
          );
        } else return endingProperties;
      };
      const allProperties = await getAllExistingProperties([], 0);
      const existingProperties = allProperties.filter(property => {
        property.name === "faction_rank" ||
          property.name === "num_ideas_submitted";
      });
      console.log(existingProperties);
      if (existingProperties.length === 0) {
        await createProperty(propertyGroupInfo.name);
        res.send("Properties Created");
      } else {
        res.send("Properties Already Existed");
      }
    } else {
      try {
        const groupResponse = await hubspotClient.crm.properties.groupsApi.create(
          "contacts",
          propertyGroupInfo
        );
        const propertiesResponse = await createProperty(propertyGroupInfo.name);
        res.send(propertiesResponse);
      } catch (err) {
        next(err);
      }
    }
  };

  checkForPropInfo();
});

apiRouter.get("/companies/create-or-update/:faction/:accessToken",async (req, res, next) => {
    const { faction, accessToken } = req.params;
    hubspotClient.setAccessToken(accessToken);
    const searchCriteria = {
      filterGroups: [
        {
          filters: [{ propertyName: "domain", operator: "EQ", value: faction }]
        }
      ]
    };
    try {
      const companiesByDomain = await hubspotClient.crm.companies.searchApi.doSearch(
        searchCriteria
      );
      if (companiesByDomain.body.results.length > 0) {
        res.send(companiesByDomain.body.results[0]);
      } else {
        const newCompany = await hubspotClient.crm.companies.basicApi.create({
          properties: { domain: faction }
        });
        res.send(newCompany.body);
      }
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
);