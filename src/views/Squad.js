import { supportedPositions } from '../data/players.js';
import { formatBudget, formatCompactBudget } from '../utils/format.js';

const skillLabels = [
  ['Tempo', 'pace'],
  ['Schuss', 'shooting'],
  ['Pass', 'passing'],
  ['Abwehr', 'defending'],
  ['Tor', 'goalkeeping'],
];

function renderSkillPills(player) {
  return skillLabels
    .map(([label, key]) => `<span class="skill-pill">${label}: <strong>${player[key]}</strong></span>`)
    .join('');
}

export function renderSquad(state) {
  const rows = state.squad
    .map(
      (player) => `
        <div class="squad-row" role="row">
          <div class="player-name" role="cell">
            <strong>${player.name}</strong>
            <small>${player.age} Jahre · Gehalt ${formatCompactBudget(player.salary)}</small>
          </div>
          <span class="position-badge" role="cell">${player.position}</span>
          <strong class="strength-score" role="cell">${player.strength}</strong>
          <div class="skill-list" role="cell">${renderSkillPills(player)}</div>
          <span role="cell">Talent ${player.potential}</span>
          <span role="cell">${formatBudget(player.marketValue)}</span>
        </div>
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
          <span role="columnheader">Fähigkeiten</span>
          <span role="columnheader">Potenzial</span>
          <span role="columnheader">Wert</span>
        </div>
        ${rows}
      </div>
    </div>
  `;
}
