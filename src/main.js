import './style.css';
import { GameEngine } from './GameEngine.js';

document.querySelector('#app').innerHTML = `
  <div class="game-shell">
    <div id="viewport" class="viewport"></div>
    <div class="health-hud">
      <p class="health-label">Health</p>
      <div class="health-bar">
        <div id="health-fill" class="health-fill"></div>
      </div>
      <strong id="health-value" class="health-value">100 / 100</strong>
    </div>
    <div id="title-screen" class="title-screen">
      <div class="title-backdrop"></div>
      <div class="title-card">
        <p class="title-kicker">Voxel FPS x Number Theory</p>
        <h1>Numbercraft Voxel</h1>
        <p class="title-subtitle">Prime shots, factor bullets, safe-zone survival, and bosses built around gcd and lcm.</p>
        <div class="title-actions">
          <button id="play-button" class="title-button title-button-primary" type="button">Play</button>
          <button id="instructions-button" class="title-button" type="button">Instructions</button>
        </div>
        <div id="title-instructions" class="title-instructions is-hidden">
          <p><strong>1</strong> Prime Blaster for prime enemies.</p>
          <p><strong>2</strong> Factor Cannon for composite enemies, then use <strong>Q / E</strong> to choose the bullet number.</p>
          <p><strong>3</strong> GCD Pulse for the boss shield.</p>
          <p><strong>F</strong> Fermat Scan after picking up the Fermat Lens.</p>
        </div>
      </div>
    </div>
    <div class="hud">
      <div class="corner-stats">
        <div class="corner-card">
          <p class="corner-label">High Score</p>
          <strong id="high-score-value">0</strong>
        </div>
        <button id="view-toggle" class="view-toggle" type="button">Third Person</button>
        <button id="pause-toggle" class="view-toggle" type="button">Pause</button>
      </div>

      <div class="hud-panel hud-title">
        <p class="eyebrow">Numbercraft Voxel</p>
        <h1>Number Theory Blaster</h1>
        <p id="objective" class="objective"></p>
      </div>

      <div class="hud-panel hud-status">
        <div class="stat-row">
          <span>Stage</span>
          <strong id="stage-name"></strong>
        </div>
        <div class="stat-row">
          <span>Weapon</span>
          <strong id="weapon-name"></strong>
        </div>
        <div class="stat-row">
          <span>World Rule</span>
          <strong id="zone-rule"></strong>
        </div>
        <div class="stat-row">
          <span>Score</span>
          <strong id="score-value"></strong>
        </div>
        <div class="stat-row">
          <span>Selected</span>
          <strong id="cycle-value"></strong>
        </div>
        <div class="stat-row">
          <span>Enemies Left</span>
          <strong id="enemies-left"></strong>
        </div>
      </div>

      <div class="hud-panel hud-target">
        <p class="panel-label">Target</p>
        <h2 id="target-name">No target</h2>
        <p id="target-details">Scan an enemy with the crosshair to inspect its number.</p>
        <p id="target-hint"><strong>Hint:</strong> Prime enemies die to weapon 1. Composite enemies usually want weapon 2.</p>
      </div>

      <div class="hud-panel hud-help">
        <div class="help-header">
          <p class="panel-label">Controls</p>
          <button id="help-toggle" class="help-toggle" type="button" aria-expanded="true" aria-controls="help-body">
            Hide
          </button>
        </div>
        <div id="help-body" class="help-body">
          <p>WASD move, mouse aim, Space jump, Shift sprint, click fire.</p>
          <p><strong>1 Prime Blaster:</strong> use this on prime enemies only.</p>
          <p><strong>2 Factor Cannon:</strong> equip this first for composite enemies. Then use <strong>Q / E</strong> to pick the bullet number: <strong>[2]</strong>, <strong>[3]</strong>, <strong>[5]</strong>, or <strong>[7]</strong>.</p>
          <p><strong>3 GCD Pulse:</strong> this is a different weapon for the boss shield. It does <strong>not</strong> mean a 3-bullet.</p>
          <p><strong>Q / E:</strong> after pressing <strong>2</strong> or <strong>3</strong>, change the current number. Example: to finish <strong>6 -> remain 3</strong>, press <strong>2</strong>, then <strong>Q / E</strong> until the HUD says <strong>Factor Cannon [3]</strong>, then fire.</p>
          <p><strong>F Fermat Scan:</strong> after picking up the Fermat Lens, it tells you if the target is prime or composite.</p>
        </div>
      </div>

      <button id="help-open" class="help-open is-hidden" type="button">
        Show Controls
      </button>
      <div id="selection-indicator" class="selection-indicator">
        <p class="selection-title" id="selection-title">Key 1 Selected</p>
        <p class="selection-label" id="selection-label">Prime Blaster</p>
        <p class="selection-detail" id="selection-detail">Shoot prime enemies with this weapon.</p>
      </div>
    </div>

    <div class="hud-panel hud-feedback">
      <p class="panel-label">Combat Feed</p>
      <p id="feedback-text">Click to lock the cursor. Start with weapon 1 and shoot the prime enemies.</p>
    </div>

    <div class="crosshair" aria-hidden="true"></div>
    <div id="weapon-view" class="weapon-view weapon-standard" aria-hidden="true">
      <div class="weapon-arm"></div>
      <div class="weapon-hand"></div>
      <div class="weapon-gun">
        <div class="weapon-body"></div>
        <div class="weapon-accent"></div>
        <div class="weapon-barrel"></div>
        <div class="weapon-sight"></div>
        <div id="weapon-badge" class="weapon-badge">P</div>
      </div>
      <div id="weapon-readout" class="weapon-readout">Prime Blaster</div>
    </div>
    <div id="game-over-overlay" class="game-over-overlay is-hidden">
      <div class="game-over-card">
        <p class="panel-label">Run Ended</p>
        <h2 id="game-over-title">Game Over</h2>
        <p id="game-over-text">An enemy touched you.</p>
        <div class="game-over-stats">
          <p>Score: <strong id="game-over-score">0</strong></p>
          <p>High Score: <strong id="game-over-high-score">0</strong></p>
        </div>
        <button id="replay-button" class="replay-button" type="button">Replay From Level 1</button>
      </div>
    </div>
    <div id="pause-overlay" class="game-over-overlay is-hidden">
      <div class="game-over-card">
        <p class="panel-label">Game Paused</p>
        <h2>Paused</h2>
        <p>Take a breath, then jump back into the number battle when you are ready.</p>
        <button id="resume-button" class="replay-button" type="button">Resume</button>
      </div>
    </div>
    <div id="center-banner" class="center-banner is-hidden"></div>
  </div>
`;

const engine = new GameEngine({
  viewport: document.querySelector('#viewport'),
  stageName: document.querySelector('#stage-name'),
  objective: document.querySelector('#objective'),
  weaponName: document.querySelector('#weapon-name'),
  zoneRule: document.querySelector('#zone-rule'),
  scoreValue: document.querySelector('#score-value'),
  cycleValue: document.querySelector('#cycle-value'),
  enemiesLeft: document.querySelector('#enemies-left'),
  targetName: document.querySelector('#target-name'),
  targetDetails: document.querySelector('#target-details'),
  targetHint: document.querySelector('#target-hint'),
  feedbackText: document.querySelector('#feedback-text'),
  healthFill: document.querySelector('#health-fill'),
  healthValue: document.querySelector('#health-value'),
  highScoreValue: document.querySelector('#high-score-value'),
  selectionIndicator: document.querySelector('#selection-indicator'),
  selectionTitle: document.querySelector('#selection-title'),
  selectionLabel: document.querySelector('#selection-label'),
  selectionDetail: document.querySelector('#selection-detail'),
  weaponView: document.querySelector('#weapon-view'),
  weaponBadge: document.querySelector('#weapon-badge'),
  weaponReadout: document.querySelector('#weapon-readout'),
  viewToggle: document.querySelector('#view-toggle'),
  pauseToggle: document.querySelector('#pause-toggle'),
  pauseOverlay: document.querySelector('#pause-overlay'),
  gameOverOverlay: document.querySelector('#game-over-overlay'),
  gameOverTitle: document.querySelector('#game-over-title'),
  gameOverText: document.querySelector('#game-over-text'),
  gameOverScore: document.querySelector('#game-over-score'),
  gameOverHighScore: document.querySelector('#game-over-high-score'),
  centerBanner: document.querySelector('#center-banner'),
});

const helpPanel = document.querySelector('.hud-help');
const hud = document.querySelector('.hud');
const helpToggle = document.querySelector('#help-toggle');
const helpOpen = document.querySelector('#help-open');
const replayButton = document.querySelector('#replay-button');
const titleScreen = document.querySelector('#title-screen');
const playButton = document.querySelector('#play-button');
const instructionsButton = document.querySelector('#instructions-button');
const titleInstructions = document.querySelector('#title-instructions');
const viewToggle = document.querySelector('#view-toggle');
const pauseToggle = document.querySelector('#pause-toggle');
const resumeButton = document.querySelector('#resume-button');

function setHelpHidden(hidden) {
  helpPanel?.classList.toggle('is-hidden-panel', hidden);
  hud?.classList.toggle('help-hidden', hidden);
  helpOpen?.classList.toggle('is-hidden', !hidden);
  helpToggle.textContent = hidden ? 'Show' : 'Hide';
  helpToggle.setAttribute('aria-expanded', String(!hidden));
}

helpToggle?.addEventListener('click', () => {
  engine.playUiClick();
  setHelpHidden(true);
});

helpOpen?.addEventListener('click', () => {
  engine.playUiClick();
  setHelpHidden(false);
});

replayButton?.addEventListener('click', () => {
  engine.playUiClick();
  engine.restartGame();
});

playButton?.addEventListener('click', () => {
  engine.playUiClick();
  titleScreen?.classList.add('is-hidden');
  engine.setIntroActive(false);
});

instructionsButton?.addEventListener('click', () => {
  engine.playUiClick();
  titleInstructions?.classList.toggle('is-hidden');
});

viewToggle?.addEventListener('click', () => {
  engine.playUiClick();
  const modeLabel = engine.toggleCameraMode();
  viewToggle.textContent = modeLabel === 'Third Person' ? 'First Person' : 'Third Person';
});

pauseToggle?.addEventListener('click', () => {
  engine.playUiClick();
  const paused = engine.togglePause();
  pauseToggle.textContent = paused ? 'Resume' : 'Pause';
});

resumeButton?.addEventListener('click', () => {
  engine.playUiClick();
  engine.setPaused(false);
  pauseToggle.textContent = 'Pause';
});

setHelpHidden(true);
engine.start();
