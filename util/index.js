const fs = require("fs");
const {getAllStats} = require("../services/cfbRankingService");
const fetch = require("node-fetch");
const {Headers} = require("node-fetch");
const {getFBSTeams} = require("../services/cfbService");
const teams = require("../data/fbs-teams.json");
const draftPicks = require("../data/fbs-draft-stats.json");
const statRanks = require("../data/cfb-stat-rankings-copy.json");

const generateGameStatsJson = () => {
  const stats = require("./data/cfb-game-stats-new.json");

  let content = {}

  for (let [gameId, gameStats] of Object.entries(stats)) {
    let teams = gameStats.teams.map(({stats, ...team}) => {
      let tmpStats = {};
      for (let stat of Object.values(stats)) {
        for (let [k, v] of Object.entries(stat)) {
          tmpStats[k] = v;
        }
      }
      return ({...team, stats: tmpStats});
    })
    content[gameId] = {...gameStats, teams};
  }

  content = JSON.stringify(content);

  fs.writeFile(__dirname + "/data/cfb-game-stats.json", content, err => {
    if (err) {
      console.log("Error generating cfb-game-stats json file", err);
    }
  });
}

const generateGameStatsNewJson = async () => {
  const url = process.env.BASE_URL;
  const apiKey = process.env.API_AUTH_KEY;
  const headers = new Headers();
  headers.set("Authorization", apiKey);
  headers.set("accept", "application/json");

  let yearToRun = 1936;
  let content = {};

  while (yearToRun < 2022) {
    const response = await fetch(`${url}/rankings?year=${yearToRun}&seasonType=both`, {headers});
    const data = await response.json();
    if (data && data.length) {
      content[yearToRun] = data
        .map(({polls, ...rest}) =>
          ({
            ...rest,
            polls: polls.filter(poll => poll.poll === "AP Top 25")[0]
              ?.ranks.sort((rank1, rank2) => rank1.rank - rank2.rank)
          }))
        .sort((week1, week2) => week1.week - week2.week);

      let postSeasonIndex = content[yearToRun].findIndex(week => week.seasonType === "postseason");
      if (postSeasonIndex !== -1) {
        content[yearToRun].push(content[yearToRun].splice(postSeasonIndex, 1).pop());
      }
    }
    yearToRun += 1;
  }

  content = JSON.stringify(content);

  fs.writeFile(__dirname + "/data/cfb-game-stats-new.json", content, err => {
    if (err) {
      console.log("Error generating cfb-game-stats-new json file", err);
    }
  });
}

const generateStatRankingsJson = async () => {
  let content = await getAllStats();
  content = JSON.stringify(content);

  fs.writeFile(__dirname + "/data/cfb-stat-rankings-copy.json", content, err => {
    if (err) {
      console.log("Error generating cfb-stat-rankings json file", err);
    }
  });
}

const generateNflDraftJson = async () => {
  const draftArray = [];

  const url = process.env.BASE_URL;
  const apiKey = process.env.API_AUTH_KEY;
  const headers = new Headers();
  headers.set("Authorization", apiKey);
  headers.set("accept", "application/json");

  let year = 1967;
  while (year < 2022) {
    const nflDraftData = await (await fetch(`${url}/draft/picks?year=${year}`, {headers})).json();

    if (nflDraftData && nflDraftData.length) {
      draftArray.unshift(nflDraftData);
    }
    year++;
  }

  const content = JSON.stringify(draftArray);

  console.log("Content ready to be written");

  fs.writeFile(__dirname + "/../data/nfl-draft-picks.json", content, err => {
    if (err) {
      console.log("Error generating nfl draft picks json file", err);
    }
  });
}

const updatePicks = (rankArr, pick) => {
  const i = rankArr.findIndex(team => team.id === pick.collegeId);

  rankArr[i] = {
    ...rankArr[i],
    picks: rankArr[i].picks + 1
  };
}

const regenerateStatsWithNflDraftPicksJson = async () => {
  const nflDraftData = require("../data/nfl-draft-picks.json");
  const statRankings = require("../data/cfb-stat-rankings-copy.json");
  const fbsTeams = await getFBSTeams();

  let draftRankings = {
    firstRoundPicks: [],
    draftPicks: [],
    numberOnePicks: [],
    mrIrrelevants: [],
  };

  let teams = fbsTeams.map(team => team.id);
  Object.values(draftRankings).forEach(arr => {
    fbsTeams.forEach(team => arr.push({id: team.id, picks: 0}));
  });

  nflDraftData.forEach(year => {
    year.forEach((pick, index) => {
      if (teams.includes(pick.collegeId)) {
        if (pick.overall === 1) updatePicks(draftRankings.numberOnePicks, pick);
        if (pick.round === 1) updatePicks(draftRankings.firstRoundPicks, pick);
        if (index === year.length - 1) updatePicks(draftRankings.mrIrrelevants, pick);
        updatePicks(draftRankings.draftPicks, pick);
      }
    });
  });

  Object.keys(draftRankings).forEach(key => {
    draftRankings[key] = draftRankings[key].sort((t1, t2) => t2.picks - t1.picks);
  });

  console.log(draftRankings);
}

const generateFbsTeamsJson = async () => {
  const teams = await getFBSTeams();
  const content = JSON.stringify(teams);

  fs.writeFile(__dirname + "/../data/fbs-teams.json", content, err => {
    if (err) {
      console.log("Error generating nfl draft picks json file", err);
    }
  });
}


const generateFbsNflDraftJson = async () => {
  let teams = require("../data/fbs-teams.json");
  teams = teams.map(team => ({
    id: team.id,
    school: team.school,
    draftPicks: 0,
    numberOnePicks: 0,
    firstRoundPicks: 0,
    mrIrrelevants: 0,
  }));

  const content = JSON.stringify(teams);

  fs.writeFile(__dirname + "/../data/fbs-draft-stats.json", content, err => {
    if (err) {
      console.log("Error generating nfl draft picks json file", err);
    }
  });
}

const generateNewStatRankingsJson = () => {
  const draftPicks = require("../data/fbs-draft-stats.json");
  const statRanks = require("../data/cfb-stat-rankings-copy.json");

  let updatedRanks = {
    draftPicks: draftPicks
      .map(team => ({id: team.id, school: team.school, draftPicks: team.draftPicks}))
      .sort((a, b) => b.draftPicks - a.draftPicks),
    numberOnePicks: draftPicks
      .map(team => ({id: team.id, school: team.school, numberOnePicks: team.numberOnePicks}))
      .sort((a, b) => b.numberOnePicks - a.numberOnePicks),
    firstRoundPicks: draftPicks
      .map(team => ({id: team.id, school: team.school, firstRoundPicks: team.firstRoundPicks}))
      .sort((a, b) => b.firstRoundPicks - a.firstRoundPicks),
    mrIrrelevants: draftPicks
      .map(team => ({id: team.id, school: team.school, mrIrrelevants: team.mrIrrelevants}))
      .sort((a, b) => b.mrIrrelevants - a.mrIrrelevants)
  };

  const content = JSON.stringify({...statRanks, ...updatedRanks});

  fs.writeFile(__dirname + "/../data/cfb-stat-rankings-copy.json", content, err => {
    if (err) {
      console.log("Error generating updated stat rankings json file", err);
    }
  });
}

const generateUpdatedStatRankingsWithBowlGames = async () => {
  const statRanks = require("../data/cfb-stat-rankings-copy.json");
  const games = require("../data/yearly-games.json").filter(game => game.season_type === "postseason");
  const teams = require("../data/fbs-teams.json");

  const url = process.env.BASE_URL;
  const apiKey = process.env.API_AUTH_KEY;
  const headers = new Headers();
  headers.set("Authorization", apiKey);
  headers.set("accept", "application/json");

  const bowlGames = [];

  teams.forEach(team => {
    const {id} = team;
    const postSeasonGames = games.filter(game => game.home_id === id || game.away_id === id);
    const totalGames = postSeasonGames.length;

    const wins = postSeasonGames.filter(game => id === game.home_id
      ? game.home_points > game.away_points
      : id === game.away_id
        ? game.away_points > game.home_points : false
    ).length;

    const losses = postSeasonGames.filter(game => id === game.home_id
      ? game.home_points < game.away_points
      : id === game.away_id
        ? game.away_points < game.home_points : false
    ).length;

    const ties = totalGames - wins - losses;

    const ranks = {
      id,
      bowlGames: postSeasonGames.length,
      wins,
      losses,
      ties,
      pct: wins / totalGames
    };
    bowlGames.push(ranks);
  });

  const newStatRanks = {
    ...statRanks,
    totalBowlGames: bowlGames
      .map(t => ({id: t.id, bowlGames: t.bowlGames}))
      .sort((a, b) => b.bowlGames - a.bowlGames),
    bowlWins: bowlGames
      .sort((a, b) => b.wins - a.wins),
    bowlWinPercentage: bowlGames
      .filter(team => team.bowlGames >= 10)
      .map(t => ({id: t.id, pct: t.pct}))
      .sort((a, b) => b.pct - a.pct)
  };

  console.log("Updating with new stat rankings");

  fs.writeFile(__dirname + "/../data/cfb-stat-rankings.json", JSON.stringify(newStatRanks), err => {
    if (err) {
      console.log("Error generating new stat ranks json file", err);
    }
  });
}

const fixPostseasonGames = () => {
  const gamesThatShouldBeRegular = require("../data/postseason-sb-regular.json");
  const games = require("../data/yearly-games.json");

  gamesThatShouldBeRegular.forEach(id => {
    const index = games.findIndex(game => game.id === id);

    if (index === -1) {
      console.log("Something went terribly wrong");
    }
    games[index].season_type = "regular";
  });

  fs.writeFile(__dirname + "/../data/yearly-games.json", JSON.stringify(games), err => {
    if (err) {
      console.log("Error generating new stat ranks json file", err);
    }
  });
}


const updateStatRankings = async () => {
  const statRanks = require("../data/cfb-stat-rankings.json");
  const newStatRanks = {
    ...statRanks,
    bowlWinPercentage: statRanks.bowlWinPercentage.map(team => ({teamId: team.id, ...team})),
    bowlWins: statRanks.bowlWins.map(team => ({teamId: team.id, ...team})),
    draftPicks: statRanks.draftPicks.map(team => ({teamId: team.id, ...team})),
    firstRoundPicks: statRanks.firstRoundPicks.map(team => ({teamId: team.id, ...team})),
    mrIrrelevants: statRanks.mrIrrelevants.map(team => ({teamId: team.id, ...team})),
    numberOnePicks: statRanks.numberOnePicks.map(team => ({teamId: team.id, ...team})),
    totalBowlGames: statRanks.totalBowlGames.map(team => ({teamId: team.id, ...team})),
  };

  fs.writeFile(__dirname + "/../data/cfb-stat-rankings.json", JSON.stringify(newStatRanks), err => {
    if (err) {
      console.log("Error generating new stat ranks json file", err);
    }
  });
}


module.exports = {
  generateStatRankingsJson,
  generateGameStatsNewJson,
  generateGameStatsJson,
  generateNflDraftJson,
  regenerateStatsWithNflDraftPicksJson,
  generateFbsTeamsJson,
  generateFbsNflDraftJson,
  generateNewStatRankingsJson,
  generateUpdatedStatRankingsWithBowlGames,
  fixPostseasonGames,
  updateStatRankings,
}
