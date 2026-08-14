import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GAME_OVER_SCORE,
  applyRound,
  createGame,
  getFinishedPlayers,
  resetScores,
} from '../game.js';

test('создаёт партию для 2–4 игроков и нормализует пустые имена', () => {
  const game = createGame(['Серёга', '   ', 'Женя']);

  assert.deepEqual(
    game.players.map((player) => player.name),
    ['Серёга', 'Игрок 2', 'Женя'],
  );
});

test('не открывает счёт за раунд меньше 13 и хранит его на карандаше', () => {
  let game = createGame(['Первый', 'Второй']);
  game = applyRound(game, [7, 5]);
  game = applyRound(game, [5, 6]);

  assert.equal(game.players[0].score, 12);
  assert.equal(game.players[0].opened, false);
  assert.equal(game.players[1].score, 11);
  assert.equal(game.players[1].opened, false);
});

test('ноль сбрасывает предварительный счёт до открытия', () => {
  let game = createGame(['Первый', 'Второй']);
  game = applyRound(game, [12, 4]);
  game = applyRound(game, [0, 0]);

  assert.equal(game.players[0].score, 0);
  assert.equal(game.players[1].score, 0);
});

test('раунд от 13 открывает счёт, после чего ноль его не сбрасывает', () => {
  let game = createGame(['Первый', 'Второй']);
  game = applyRound(game, [13, 15]);
  game = applyRound(game, [0, 0]);

  assert.equal(game.players[0].score, 13);
  assert.equal(game.players[0].opened, true);
  assert.equal(game.players[1].score, 15);
  assert.equal(game.players[1].opened, true);
});

test('завершает партию на 101 очке и возвращает проигравшего', () => {
  let game = createGame(['Первый', 'Второй']);
  game = applyRound(game, [90, 13]);
  game = applyRound(game, [11, 0]);

  assert.equal(game.finished, true);
  assert.equal(game.players[0].score, GAME_OVER_SCORE);
  assert.deepEqual(getFinishedPlayers(game).map((player) => player.name), ['Первый']);
});

test('после завершения партии новые раунды не меняют счёт', () => {
  let game = createGame(['Первый', 'Второй']);
  game = applyRound(game, [101, 13]);

  assert.strictEqual(applyRound(game, [10, 10]), game);
});

test('сброс очков сохраняет игроков и возвращает закрытый счёт', () => {
  let game = createGame(['Первый', 'Второй']);
  game = applyRound(game, [40, 20]);
  game = resetScores(game);

  assert.deepEqual(
    game.players.map(({ name, score, opened }) => ({ name, score, opened })),
    [
      { name: 'Первый', score: 0, opened: false },
      { name: 'Второй', score: 0, opened: false },
    ],
  );
  assert.equal(game.finished, false);
});

test('отклоняет отрицательные и дробные очки', () => {
  const game = createGame(['Первый', 'Второй']);

  assert.throws(() => applyRound(game, [-1, 0]), RangeError);
  assert.throws(() => applyRound(game, [1.5, 0]), RangeError);
});
