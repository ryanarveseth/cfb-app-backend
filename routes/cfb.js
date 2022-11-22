const {
  getBestGamesAndHighlights,
  postGetGameStats,
  getFullTeamSchedule,
  getFbsTeams,
  getFbsTeam,
  getFbsConferences
} = require("../services/cfbService");

const express = require('express');
const {getTeamRecords} = require("../services/cfbRankingService");
const router = express.Router();

router
  .get("/loadCfbData", getBestGamesAndHighlights)
  .get("/teams/schedule/:teamId", getFullTeamSchedule)
  .get("/teams/fbs", getFbsTeams)
  .get("/teams/rankings", getTeamRecords)
  .get("/teams/:teamId", getFbsTeam)
  .get("/conferences", getFbsConferences)
  .post("/games", postGetGameStats)

module.exports = router;
