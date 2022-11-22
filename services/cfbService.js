const fetch = require('node-fetch');
const {
  Headers,
} = require('node-fetch');
const fs = require('fs');

const postGetGameStats = async (req, res) => {
  const {games} = req.body;
  return res.send(getGameStats(games));
}

const getGameStats = (games) => {
  const gameStats = require("../data/cfb-game-stats.json");
  if (Array.isArray(games)) {
    let gamesObj = {};
    games.forEach(game => {
      if (gameStats.hasOwnProperty(game)) {
        gamesObj[game] = gameStats[game];
      }
    });
    return gamesObj;
  } else {
    return gameStats.hasOwnProperty(games) ? gameStats[games] : {};
  }
}

const getTeam = (teamId) => {
  teamId = parseInt(teamId);
  const teams = require("../data/cfb-teams.json");
  const team = teams.filter(t => teamId === t.id);

  if (team && team.length) return team[0];
  return {};
}

const didGameEndWithTie = (homeScore, awayScore) => homeScore === awayScore;
const didTeamWin = (gameInfo, teamId) =>
  gameInfo.home_points > gameInfo.away_points && teamId === gameInfo.home_id
    ? true
    : (gameInfo.home_points < gameInfo.away_points && teamId === gameInfo.away_id);

const getGameResult = (gameInfo, teamId) =>
  didGameEndWithTie(gameInfo.home_points, gameInfo.away_points)
    ? "Tie"
    : didTeamWin(gameInfo, parseInt(teamId)) ? "W" : "L";

const getBestGamesAndHighlights = async (req, res, next) => {
  const url = process.env.BASE_URL;
  const apiKey = process.env.API_AUTH_KEY;
  const headers = new Headers();
  headers.set("Authorization", apiKey);
  headers.set("accept", "application/json");

  const fileName = "../data/yearly-games.json";
  const yearlyGamesJson = require(fileName);

  const arr = yearlyGamesJson
    .map(game => (
      {
        id: game.id,
        homeTeam: game.home_team,
        homeScore: game.home_points,
        awayScore: game.away_points,
        awayTeam: game.away_team,
        excitement_index: parseFloat(game.excitement_index),
        highlights: game.highlights || "",
        year: game.season,
        seasonType: game.season_type,
        startDate: game.start_date,
      }))
    .filter(game => game && game.highlights)
    .sort((a, b) => (a.excitement_index < b.excitement_index) ? 1 : -1)
    .map((game, index) => ({
      gameRanking: index,
      ...game
    }));

  res.send(arr);
}

const getFullTeamSchedule = async (req, res, next) => {
  const teamId = parseInt(req.params.teamId);
  const url = process.env.BASE_URL;
  const apiKey = process.env.API_AUTH_KEY;
  const headers = new Headers();
  headers.set("Authorization", apiKey);
  headers.set("accept", "application/json");

  const fileName = "../data/yearly-games.json";
  const yearlyGamesJson = require(fileName);
  const teamImageJson = require("../data/cfb-team-images.json");

  const arr = yearlyGamesJson
    .filter(game => game.home_id === teamId || game.away_id === teamId)
    .map(game => {
      const teamIsHome = game.home_id === teamId;
      let opponentLogos = [];
      let opponent;
      let opponentId;
      let opponentConference;

      if (teamIsHome) {
        opponentLogos = teamImageJson.filter(team => team.id === game.away_id).map(team => team.logos);
        opponent = game.away_team;
        opponentId = game.away_id;
        opponentConference = game.away_conference;
      } else {
        opponentLogos = teamImageJson.filter(team => team.id === game.home_id).map(team => team.logos);
        opponent = game.home_team;
        opponentId = game.home_id;
        opponentConference = game.home_conference;
      }

      return ({
        ...game,
        is_home_team: teamIsHome,
        game_result: getGameResult(game, parseInt(teamId)),
        opponent_logos: opponentLogos && opponentLogos.length ? opponentLogos[0] : null,
        opponent,
        opponent_id: opponentId,
        opponent_conference: opponentConference
      })
    });

  let yearData = {};
  const schedule = [];

  arr.forEach(game => {
    if (!yearData[game.season]) {
      yearData[game.season] = []
    }
    yearData[game.season].push(game);
  });

  for (let [year, yearSchedule] of Object.entries(yearData)) {
    let index = yearSchedule.findIndex(game => game.season_type !== "regular");
    if (index !== -1) {
      yearSchedule.push(yearSchedule.splice(index, 1)[0]);
    }

    index = yearSchedule.findIndex(game => game.season_type !== "regular");
    if (index !== -1 && index !== yearSchedule.length - 1) {
      yearSchedule.push(yearSchedule.splice(index, 1)[0]);
    }

    let record;
    let wins = 0;
    let loss = 0;
    let ties = 0;

    yearSchedule.forEach(game => {
      if (game.game_result === "W") wins += 1;
      if (game.game_result === "L") loss += 1;
      if (game.game_result === "Tie") ties += 1;
    });

    if (ties) {
      record = `${wins}-${loss}-${ties}`;
    } else {
      record = `${wins}-${loss}`;
    }

    schedule.unshift({year, schedule: yearSchedule, record, wins, loss, ties});
  }

  res.send(schedule);
}

const getFBSTeams = () => {
  return require("../data/fbs-teams.json");
}

const getFbsTeams = async (req, res, next) => {
  const teams = await getFBSTeams();

  res.json(teams.filter(team => team.id !== 256)); // James Madison is NOT FBS
}

const getFbsTeam = async (req, res, next) => {
  const {teamId} = req.params;
  const team = getTeam(teamId);
  if (!team || !team.school) return;

  const school = team.school;

  const rankingJson = require("../data/cfb-rankings.json");
  let rankings = {};
  for (let [year, value] of Object.entries(rankingJson)) {
    rankings[year] = value.map(week => {
      if (!week.polls) return {};
      if (week.polls.filter(rank => rank.school === school).length > 0) {
        return {...week, polls: week.polls ? week.polls.filter(rank => rank.school === school) : []};
      }
      return {};
    })
      .filter(week => JSON.stringify(week) !== "{}");

    if (JSON.stringify(rankings[year]) === "[]") delete rankings[year];
  }

  return res.json({...team, rankings});
}

const getFbsConferences = async (req, res) => {
  const url = process.env.BASE_URL;
  const apiKey = process.env.API_AUTH_KEY;
  const headers = new Headers();
  headers.set("Authorization", apiKey);
  headers.set("accept", "application/json");

  const fbsConferences = await (await fetch(`${url}/conferences`, {headers})).json();
  const fbsTeams = getFBSTeams();

  const getLogos = (abbr) => {
    abbr = abbr.toLowerCase();
    const ext = (abbr === "ind" || abbr === "mac") ? ".png" : ".svg";
    return [
      abbr + "_logo_dark" + ext,
      abbr + "_logo_white" + ext,
    ];
  };

  return res.json(
    fbsConferences
      .filter(conference => conference.classification === "fbs")
      .map(conference => ({
        ...conference,
        logos: getLogos(conference.abbreviation),
        teams: fbsTeams
          .filter(team => team.conference === conference.name)
          .map(team => ({id: team.id, school: team.school, division: team.division})),
      }))
      .filter(conference => conference.teams.length > 0)
  );
}


module.exports = {
  getBestGamesAndHighlights,
  postGetGameStats,
  getFullTeamSchedule,
  getGameStats,
  getGameResult,
  getFbsConferences,
  getFbsTeams,
  getFBSTeams,
  getFbsTeam,
  getTeam,
}
