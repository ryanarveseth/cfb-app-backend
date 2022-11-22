// Our initial setup (package requires, port number setup)
const express = require('express');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 5000 // So we can run on heroku || (OR) localhost:5000

require('dotenv').config();

// const corsOptions = {
//   origin: "https://cfb-backend.com/",
//   optionsSuccessStatus: 200
// };

const app = express();

// Route setup. You can implement more in the future!
const routes = require('./routes/cfb');
const {generateUpdatedStatRankingsWithBowlGames, fixPostseasonGames, updateStatRankings} = require("./util");

app
  .use(express.json())
  .use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // TODO: Update this to only allow frontend as origin
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Content-Type", "application/json");
    next();
  })
  .use('/api', routes)
  .get('*', (req, res, next) => {
    res
      .status(404)
      .send({ error: "404: Page not found" })
  });

app.listen(PORT);
