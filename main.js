import {
  GAME_OVER_SCORE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  applyRound,
  createGame,
  getFinishedPlayers,
  resetScores,
} from './game.js';

const telegram = window.Telegram?.WebApp;
const gameOverAudio = new Audio('./audio.mp3');
gameOverAudio.preload = 'auto';

const elements = {
  setupScreen: document.querySelector('[data-screen="setup"]'),
  gameScreen: document.querySelector('[data-screen="game"]'),
  finishScreen: document.querySelector('[data-screen="finish"]'),
  playerCountButtons: [...document.querySelectorAll('[data-player-count]')],
  playerNames: document.querySelector('#player-names'),
  setupForm: document.querySelector('#setup-form'),
  gameForm: document.querySelector('#game-form'),
  gamePlayers: document.querySelector('#game-players'),
  resetScoresButton: document.querySelector('#reset-scores'),
  newGameButton: document.querySelector('#new-game'),
  playAgainButton: document.querySelector('#play-again'),
  finishList: document.querySelector('#finish-list'),
};

document.addEventListener('pointerdown', (event) => {
  const target = event.target;

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return;
  }

  const activeElement = document.activeElement;

  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
  ) {
    activeElement.blur();
  }
});

let playerCount = MIN_PLAYERS;
let game = null;

function applyTelegramSafeArea() {
  const inset = telegram?.contentSafeAreaInset ?? telegram?.safeAreaInset;
  if (!inset) {
    return;
  }

  const root = document.documentElement.style;
  root.setProperty('--tg-safe-top', `${inset.top}px`);
  root.setProperty('--tg-safe-right', `${inset.right}px`);
  root.setProperty('--tg-safe-bottom', `${inset.bottom}px`);
  root.setProperty('--tg-safe-left', `${inset.left}px`);
}

function initTelegram() {
  if (!telegram) {
    return;
  }

  telegram.ready();
  telegram.expand();
  applyTelegramSafeArea();
  telegram.onEvent?.('safeAreaChanged', applyTelegramSafeArea);
  telegram.onEvent?.('contentSafeAreaChanged', applyTelegramSafeArea);

  try {
    telegram.setHeaderColor('secondary_bg_color');
    telegram.setBackgroundColor('bg_color');
  } catch {
    // Старые клиенты Telegram могут не поддерживать часть настроек chrome.
  }
}

function haptic(type = 'light') {
  telegram?.HapticFeedback?.impactOccurred(type);
}

function notify(type) {
  telegram?.HapticFeedback?.notificationOccurred(type);
}

function showScreen(screen) {
  for (const element of [elements.setupScreen, elements.gameScreen, elements.finishScreen]) {
    element.hidden = element !== screen;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPlayerNameInputs() {
  const existingNames = [...elements.playerNames.querySelectorAll('input[name="player-name"]')].map(
    (input) => input.value,
  );
  elements.playerNames.replaceChildren();

  for (let index = 0; index < playerCount; index += 1) {
    const label = document.createElement('label');
    label.className = 'field';

    const caption = document.createElement('span');
    caption.className = 'field__label';
    caption.textContent = `Игрок ${index + 1}`;

    const input = document.createElement('input');
    input.className = 'text-input';
    input.type = 'text';
    input.name = 'player-name';
    input.autocomplete = 'off';
    input.maxLength = 24;
    input.placeholder = `Игрок ${index + 1}`;
    input.value = existingNames[index] ?? `Игрок ${index + 1}`;

    label.append(caption, input);
    elements.playerNames.append(label);
  }
}

function renderGame() {
  if (!game) {
    return;
  }

  elements.gamePlayers.replaceChildren();

  for (const player of game.players) {
    const card = document.createElement('article');
    card.className = 'player-card';

    const heading = document.createElement('div');
    heading.className = 'player-card__heading';

    const name = document.createElement('h2');
    name.className = 'player-card__name';
    name.textContent = player.name;

    const state = document.createElement('span');
    state.className = `badge ${player.opened ? 'badge--open' : ''}`;
    state.textContent = player.opened ? 'Счёт открыт' : 'На карандаше';

    const score = document.createElement('strong');
    score.className = `player-card__score ${player.opened ? '' : 'player-card__score--draft'}`;
    score.textContent = String(player.score);
    score.setAttribute('aria-label', `${player.name}: ${player.score} очков`);

    const inputLabel = document.createElement('div');
    inputLabel.className = 'round-score';

    const inputCaption = document.createElement('span');
    inputCaption.textContent = 'Очки за раунд';

    const input = document.createElement('input');
    input.className = 'score-input';
    input.type = 'number';
    input.name = 'round-score';
    input.inputMode = 'numeric';
    input.min = '0';
    input.step = '1';
    input.value = '0';
    input.required = true;
    input.dataset.playerId = String(player.id);

    input.addEventListener('focus', () => {
      if (input.value === '0') {
        input.value = '';
      }
    });

    inputLabel.append(inputCaption, input);
    heading.append(name, state);
    card.append(heading, score, inputLabel);
    elements.gamePlayers.append(card);
  }
}

function renderFinish() {
  const finishedPlayers = getFinishedPlayers(game);
  elements.finishList.replaceChildren();

  for (const player of finishedPlayers) {
    const item = document.createElement('li');
    item.className = 'finish-result';

    const name = document.createElement('span');
    name.textContent = player.name;

    const score = document.createElement('strong');
    score.textContent = String(player.score);

    item.append(name, score);
    elements.finishList.append(item);
  }
}


function setPlayerCount(nextCount) {
  const count = Number(nextCount);
  if (!Number.isInteger(count) || count < MIN_PLAYERS || count > MAX_PLAYERS) {
    return;
  }

  playerCount = count;

  for (const button of elements.playerCountButtons) {
    const selected = Number(button.dataset.playerCount) === playerCount;
    button.classList.toggle('segmented__button--active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }

  renderPlayerNameInputs();
  haptic('light');
}

function collectRoundScores() {
  return [...elements.gameForm.querySelectorAll('input[name="round-score"]')].map((input) => Number(input.value));
}

function enableClosingConfirmation(enabled) {
  if (!telegram) {
    return;
  }

  if (enabled) {
    telegram.enableClosingConfirmation?.();
  } else {
    telegram.disableClosingConfirmation?.();
  }
}

function confirmAction(message, action) {
  if (telegram?.showConfirm) {
    telegram.showConfirm(message, (confirmed) => {
      if (confirmed) {
        action();
      }
    });
    return;
  }

  if (window.confirm(message)) {
    action();
  }
}

function startNewGame() {
  game = null;
  playerCount = MIN_PLAYERS;
  setPlayerCount(MIN_PLAYERS);
  enableClosingConfirmation(false);
  showScreen(elements.setupScreen);
}

for (const button of elements.playerCountButtons) {
  button.addEventListener('click', () => setPlayerCount(button.dataset.playerCount));
}

elements.setupForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const names = [...elements.setupForm.querySelectorAll('input[name="player-name"]')].map((input) => input.value);
  game = createGame(names);
  renderGame();
  showScreen(elements.gameScreen);
  enableClosingConfirmation(true);
  haptic('medium');
});

elements.gameForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!elements.gameForm.reportValidity()) {
    notify('error');
    return;
  }

  try {
    game = applyRound(game, collectRoundScores());
  } catch (error) {
    notify('error');
    telegram?.showAlert?.(error.message);
    return;
  }

  if (game.finished) {
    gameOverAudio.currentTime = 0;
    void gameOverAudio.play().catch(() => {});

    renderFinish();
    showScreen(elements.finishScreen);
    enableClosingConfirmation(false);
    notify('warning');
    return;
  }

  renderGame();
  haptic('light');
});

elements.resetScoresButton.addEventListener('click', () => {
  confirmAction('Сбросить все очки в этой партии?', () => {
    game = resetScores(game);
    renderGame();
    haptic('medium');
  });
});

elements.newGameButton.addEventListener('click', () => {
  confirmAction('Закончить текущую партию и начать новую?', startNewGame);
});

elements.playAgainButton.addEventListener('click', startNewGame);

initTelegram();
renderPlayerNameInputs();
showScreen(elements.setupScreen);

const gameOverHint = document.querySelector('#game-over-hint');
gameOverHint.textContent = `Партия заканчивается, когда кто-то набирает ${GAME_OVER_SCORE} очко или больше.`;
