import { achievementDefinitions } from '../game/achievements.js';
import { clubUpgradeDefinitions, getUpgradeCost } from '../game/clubUpgrades.js';
import { teams } from '../data/teams.js';
import { formatBudget, formatCompactBudget } from '../utils/format.js';

function getTeamsById() {
  return Object.fromEntries(teams.map((team) => [team.id, team]));
}

function renderClubUpgrades(state) {
  const rows = Object.entries(clubUpgradeDefinitions)
    .map(([key, definition]) => {
      const level = state.clubUpgrades?.[key] ?? 0;
      const isMaxed = level >= definition.maxLevel;
      const cost = getUpgradeCost(key, level);

      return `
        <article class="longterm-card">
          <div>
            <p class="eyebrow">Stufe ${level}/${definition.maxLevel}</p>
            <h3>${definition.label}</h3>
            <p>${definition.description}</p>
            <strong>${definition.effectLabel(level)}</strong>
          </div>
          <button data-upgrade-club="${key}" type="button" ${isMaxed ? 'disabled' : ''}>
            ${isMaxed ? 'Maximal' : `${formatCompactBudget(cost)} investieren`}
          </button>
        </article>
      `;
    })
    .join('');

  return `<section><h3>Vereinsausbau</h3><div class="longterm-grid">${rows}</div></section>`;
}

function renderCup(state) {
  const cup = state.cup;
  const currentRound = cup.rounds[cup.roundIndex] ?? cup.rounds.at(-1);
  const latestRound = [...cup.rounds].reverse().find((round) => round.results?.length) ?? currentRound;
  const resultRows = latestRound?.results?.map((result) => `
    <li>
      ${result.roundLabel}: ${result.homeTeam} ${result.homeGoals}:${result.awayGoals} ${result.awayTeam}
      ${result.penaltyNote ? `<small>${result.penaltyNote}</small>` : ''}
    </li>
  `).join('') || '<li>Noch keine Pokalspiele gespielt.</li>';

  return `
    <section class="longterm-section">
      <h3>DFB-Pokal</h3>
      <article class="longterm-card">
        <div>
          <p class="eyebrow">${cup.winnerId ? 'Entschieden' : 'Nächste Runde'}</p>
          <h3>${cup.winnerId ? getTeamsById()[cup.winnerId]?.name : currentRound.label}</h3>
          <p>${cup.activeParticipantIds.length} Teams sind noch dabei. Pokalrunden laufen automatisch nach festgelegten Spieltagen.</p>
        </div>
      </article>
      <ul class="event-list">${resultRows}</ul>
    </section>
  `;
}

function renderYouth(state) {
  const players = (state.youthPlayers ?? [])
    .map((player) => `
      <li>
        <strong>${player.name}</strong> · ${player.position} · Stärke ${player.strength} · Talent ${player.potential}
        ${player.isSuperTalent ? '<span class="success-badge">Supertalent</span>' : ''}
      </li>
    `)
    .join('') || '<li>Noch kein Jugendspieler entdeckt. Alle vier Wochen kommt ein neuer Kandidat.</li>';

  return `
    <section class="longterm-section">
      <h3>Jugend</h3>
      <p class="friendly-copy">Eine bessere Jugendakademie erhöht die Chance auf starke Talente und seltene Supertalente.</p>
      <ul class="event-list">${players}</ul>
    </section>
  `;
}

function renderAchievements(state) {
  const unlocked = new Set(state.achievements?.unlocked ?? []);
  const rows = Object.entries(achievementDefinitions)
    .map(([key, achievement]) => `
      <li class="achievement-row ${unlocked.has(key) ? 'unlocked' : ''}">
        <span>${unlocked.has(key) ? '🏆' : '🔒'}</span>
        <div><strong>${achievement.label}</strong><small>${achievement.description}</small></div>
      </li>
    `)
    .join('');

  return `<section class="longterm-section"><h3>Erfolge</h3><ul class="achievement-list">${rows}</ul></section>`;
}

export function renderLongTerm(state) {
  const confetti = state.feedbackEffects?.includes('confetti') ? '<div class="confetti-banner">🎉 Großer Erfolg! Dein Verein feiert mit Konfetti.</div>' : '';

  return `
    <div class="longterm-view">
      ${confetti}
      <div>
        <p class="eyebrow">Langzeitmotivation</p>
        <h2>Verein & Erfolge</h2>
        <p class="friendly-copy">
          Investiere in Infrastruktur, entwickle Jugendspieler, sammle Pokalprämien und schalte Erfolge frei.
          Verfügbares Budget: <strong>${formatBudget(state.transferBudget)}</strong>
        </p>
      </div>
      ${renderClubUpgrades(state)}
      ${renderCup(state)}
      ${renderYouth(state)}
      ${renderAchievements(state)}
    </div>
  `;
}
