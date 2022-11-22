const getNationalChampionships = () => {
  return {};
}

const getConferenceChampionships = () => {
  return {};
}

const getBowlGames = () => {
  return {};
}

const getBowlRecords = () => {
  return {};
}

const getAllAmericans = () => {
  return {};
}

const getNflDraftPicks = () => {
  return {};
}

const getLargestMarginOfVictory = (team1Id, team2Id) => {
  return {};
}

const getAllStats = async () => {
  return require("../data/cfb-stat-rankings.json");
}

const getTeamRecords = async (req, res, next) => {
  res.json(await getAllStats());
}

module.exports = {
  getBowlGames,
  getConferenceChampionships,
  getNationalChampionships,
  getLargestMarginOfVictory,
  getAllStats,
  getNflDraftPicks,
  getAllAmericans,
  getBowlRecords,
  getTeamRecords,
}
