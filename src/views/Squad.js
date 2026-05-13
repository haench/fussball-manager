import { supportedPositions } from '../data/players.js';
import { formatBudget, formatCompactBudget } from '../utils/format.js';

const skillLabels = [
  ['Tempo', 'pace'],
  ['Schuss', 'shooting'],
  ['Pass', 'passing'],
  ['Abwehr', 'defending'],
  ['Tor', 'goalkeeping'],
];


function renderPlayerSymbols(player) {
  const morale = (player.morale ?? 60) >= 70 ? '😊' : (player.morale ?? 60) < 45 ? '😟' : '😐';
  const fitness = (player.fitness ?? 80) >= 72 ? '⚡' : '🪫';
  const form = (player.form ?? 55) >= 72 ? '🔥' : '😐';

  return `
    <div class="symbol-list compact-symbols" aria-label="Form Fitness Moral">
      <span title="Form">${form} Form ${player.form}</span>
      <span title="Fitness">${fitness} Fitness ${player.fitness}</span>
      <span title="Moral">${morale} Moral ${player.morale}</span>
    </div>
  `;
}

function renderSkillPills(player) {
  return skillLabels
    .map(([label, key]) => `<span class="skill-pill">${label}: <strong>${player[key]}</strong></span>`)
    .join('');
}

function renderSkillDetails(player) {
  return `
    <details class="player-details">
      <summary>Details</summary>
      <div class="skill-list">${renderSkillPills(player)}</div>
    </details>
  `;
}

export function renderSquad(state) {
  const rows = state.squad
    .map(
      (player) => `
        <article class="squad-row player-card" role="row">
          <div class="player-name" role="cell">
            <strong>${player.name}</strong>
            <small>${player.age} Jahre · Gehalt ${formatCompactBudget(player.salary)}</small>
          </div>
          <span class="position-badge" role="cell">${player.position}</span>
          <strong class="strength-score" role="cell" aria-label="Stärke ${player.strength}">${player.strength}</strong>
          <strong class="potential-score" role="cell">Potenzial ${player.potential}</strong>
          <div class="player-mood" role="cell">${renderPlayerSymbols(player)}</div>
          <div class="player-skill-details" role="cell">${renderSkillDetails(player)}</div>
          <span class="market-value" role="cell">${formatBudget(player.marketValue)}</span>
        </article>
      `,
    )
    .join('');

  return `
    <div class="squad-view">
      <p class="eyebrow">Teammanagement</p>
      <h2>Kader</h2>
      <p class="friendly-copy">
        Hier siehst du dein Team wie in einem Sammelkarten-Heft: große Zahlen sind besser. Erlaubte Positionen sind
        ${supportedPositions.join(', ')}.
      </p>
      <p class="license-note">
        Veröffentlichungstipp: Diese Demo nutzt Fantasienamen. Für echte Namen sollte später ein Nutzer-Import oder
        ein Umschalter auf Fantasienamen erhalten bleiben.
      </p>
      <div class="squad-table" role="table" aria-label="Kaderwerte">
        <div class="squad-row squad-header" role="row">
          <span role="columnheader">Spieler</span>
          <span role="columnheader">Pos.</span>
          <span role="columnheader">Stärke</span>
          <span role="columnheader">Potenzial</span>
          <span role="columnheader">Form/Fitness/Moral</span>
          <span role="columnheader">Details</span>
          <span role="columnheader">Wert</span>
        </div>
        ${rows}
      </div>
    </div>
  `;
}
