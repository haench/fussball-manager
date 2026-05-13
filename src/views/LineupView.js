import { formations, getFormationSlots, getLineupPlayers, getPositionFit } from '../game/lineup.js';
import { defaultTactics, tacticOptions } from '../game/tactics.js';

const fitLabels = {
  empty: 'frei',
  perfect: 'perfekt',
  acceptable: 'okay',
  poor: 'schwierig',
};

function renderPlayerOptions(squad, selectedPlayerId) {
  return [
    '<option value="">Spieler wählen</option>',
    ...squad.map(
      (player) => `
        <option value="${player.id}" ${player.id === selectedPlayerId ? 'selected' : ''}>
          ${player.position} · ${player.name} (${player.strength})
        </option>
      `,
    ),
  ].join('');
}

function renderFormationOptions(currentFormation) {
  return Object.keys(formations)
    .map((formation) => `<option value="${formation}" ${formation === currentFormation ? 'selected' : ''}>${formation}</option>`)
    .join('');
}

function renderPitchLine(lineName, lineupPlayers, squad) {
  const cards = lineupPlayers
    .filter(({ slot }) => slot.line === lineName)
    .map(({ slot, player }) => {
      const fit = getPositionFit(player, slot);

      return `
        <label class="lineup-slot fit-${fit}">
          <span class="slot-label">${slot.label}</span>
          <select data-lineup-position="${slot.id}" aria-label="${slot.label} besetzen">
            ${renderPlayerOptions(squad, player?.id ?? '')}
          </select>
          <small>${player ? `${player.position} · ${fitLabels[fit]}` : 'Position frei'}</small>
        </label>
      `;
    })
    .join('');

  return `<div class="pitch-line pitch-line-${lineName}">${cards}</div>`;
}

function renderTacticSelect(field, selectedValue) {
  return `
    <label class="tactic-control">
      <span>${field.label}</span>
      <select data-tactic-field="${field.key}">
        ${tacticOptions[field.key]
          .map((option) => `<option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>${option.label}</option>`)
          .join('')}
      </select>
    </label>
  `;
}

function renderTactics(tactics) {
  const fields = [
    { key: 'playStyle', label: 'Spielweise' },
    { key: 'tempo', label: 'Tempo' },
    { key: 'pressing', label: 'Pressing' },
    { key: 'risk', label: 'Risiko' },
  ];

  return fields.map((field) => renderTacticSelect(field, tactics[field.key] ?? defaultTactics[field.key])).join('');
}

export function renderLineup(state) {
  const teamId = state.selectedClub.id;
  const lineup = state.lineupByTeamId[teamId];
  const formation = lineup?.formation ?? '4-4-2';
  const lineupPlayers = getLineupPlayers(state.squad, lineup ?? { formation, assignments: {} });
  const filledCount = lineupPlayers.filter(({ player }) => player).length;
  const perfectCount = lineupPlayers.filter(({ player, slot }) => getPositionFit(player, slot) === 'perfect').length;
  const tactics = state.tacticsByTeamId[teamId] ?? defaultTactics;

  return `
    <div class="lineup-view">
      <div class="lineup-heading">
        <div>
          <p class="eyebrow">Taktiktafel</p>
          <h2>Aufstellung</h2>
          <p class="friendly-copy">
            Wähle eine Formation, setze deine Spieler auf die Positionen und achte auf die Ampelfarben:
            grün passt perfekt, gelb ist okay, rot ist schwierig.
          </p>
        </div>
        <div class="lineup-summary">
          <strong>${filledCount}/11</strong>
          <span>${perfectCount} perfekt passend</span>
        </div>
      </div>

      <section class="lineup-toolbar" aria-label="Aufstellung einstellen">
        <label>
          <span>Formation</span>
          <select data-lineup-formation>${renderFormationOptions(formation)}</select>
        </label>
        <button data-action="best-eleven" type="button">Beste Elf aufstellen</button>
      </section>

      <section class="full-pitch" aria-label="Spielfeld-Aufstellung">
        ${['attack', 'midfield', 'defense', 'goalkeeper'].map((line) => renderPitchLine(line, lineupPlayers, state.squad)).join('')}
      </section>

      <section class="tactics-panel">
        <div>
          <p class="eyebrow">Matchplan</p>
          <h3>Einfache Taktik</h3>
          <p class="friendly-copy">Diese Werte werden beim Simulieren deines Spiels mitgegeben.</p>
        </div>
        <div class="tactics-grid">${renderTactics(tactics)}</div>
      </section>
    </div>
  `;
}
