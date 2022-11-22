const {getGameResult} = require("../services/cfbService");



const gameInfoWin1 = {
  home_points: 54,
  home_id: 1,
  away_points: 12,
  away_id: 2,
}

const gameInfoWin2 = {
  home_points: 12,
  home_id: 2,
  away_points: 54,
  away_id: 1,
}

const gameInfoLoss1 = {
  home_points: 12,
  home_id: 1,
  away_points: 54,
  away_id: 2,
}

const gameInfoLoss2 = {
  home_points: 54,
  home_id: 2,
  away_points: 12,
  away_id: 1,
}

const gameInfoTie = {
  home_points: 54,
  home_id: 1,
  away_points: 54,
  away_id: 2,
}

test('Test cfbService score functions', () => {
  expect(getGameResult(gameInfoWin1, "1")).toBe("W");
  expect(getGameResult(gameInfoWin2, "1")).toBe("W");
  expect(getGameResult(gameInfoLoss1, "1")).toBe("L");
  expect(getGameResult(gameInfoLoss2, "1")).toBe("L");
  expect(getGameResult(gameInfoTie, "1")).toBe("-");
});

