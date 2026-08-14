export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const OPENING_SCORE = 13;
export const GAME_OVER_SCORE = 101;

function assertRoundScore(score) {
  if (!Number.isInteger(score) || score < 0) {
    throw new RangeError('Очки за раунд должны быть целым неотрицательным числом');
  }
}

function applyPlayerScore(player, roundScore) {
  if (player.opened) {
    return {
      ...player,
      score: player.score + roundScore,
    };
  }

  if (roundScore === 0) {
    return {
      ...player,
      score: 0,
    };
  }

  return {
    ...player,
    score: player.score + roundScore,
    opened: roundScore >= OPENING_SCORE,
  };
}

export function createGame(playerNames) {
  if (playerNames.length < MIN_PLAYERS || playerNames.length > MAX_PLAYERS) {
    throw new RangeError(`В партии должно быть от ${MIN_PLAYERS} до ${MAX_PLAYERS} игроков`);
  }

  return {
    players: playerNames.map((name, index) => ({
      id: index + 1,
      name: name.trim() || `Игрок ${index + 1}`,
      score: 0,
      opened: false,
    })),
    finished: false,
  };
}

export function applyRound(game, roundScores) {
  if (game.finished) {
    return game;
  }

  if (roundScores.length !== game.players.length) {
    throw new RangeError('Для каждого игрока нужен результат раунда');
  }

  roundScores.forEach(assertRoundScore);

  const players = game.players.map((player, index) => applyPlayerScore(player, roundScores[index]));
  const finished = players.some((player) => player.score >= GAME_OVER_SCORE);

  return {
    players,
    finished,
  };
}

export function resetScores(game) {
  return {
    players: game.players.map((player) => ({
      ...player,
      score: 0,
      opened: false,
    })),
    finished: false,
  };
}

export function getFinishedPlayers(game) {
  return game.players.filter((player) => player.score >= GAME_OVER_SCORE);
}
