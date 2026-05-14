import { getSeasonEndSummary } from '../game/seasonEnd.js';

function renderTeamList(rows, fallback) {
  if (!rows.length) return `<li>${fallback}</li>`;

  return rows.map((row) => `<li><strong>${row.position}. ${row.club}</strong> · ${row.points} Punkte · ${row.goalDifference >= 0 ? '+' : ''}${row.goalDifference} Tore</li>`).join('');
}

function renderTopScorers(topScorers) {
  const scorers = topScorers.slice(0, 5);

  if (!scorers.length) {
    return '<li>Noch keine Torschützen aus den verfügbaren Matchdaten.</li>';
  }

  return scorers.map((scorer, index) => `<li><strong>${index + 1}. ${scorer.name}</strong> · ${scorer.team} · ${scorer.goals} ${scorer.goals === 1 ? 'Tor' : 'Tore'}</li>`).join('');
}

function renderAchievements(achievements) {
  if (!achievements.length) {
    return '<li>In dieser Saison wurden noch keine Erfolge freigeschaltet.</li>';
  }

  return achievements.map((achievement) => `<li><strong>🏆 ${achievement.label}</strong><small>${achievement.description}</small></li>`).join('');
}

export function renderSeasonEnd(state) {
  const summary = getSeasonEndSummary(state);
  const finalPosition = summary.userRow ? `Platz ${summary.userRow.position}` : 'Noch nicht platziert';
  const goalResult = summary.goal
    ? `${summary.goal.label}: ${summary.goalAchieved ? 'erreicht' : 'verpasst'} (${summary.goal.targetLabel})`
    : 'Kein Saisonziel definiert';
  const confetti = summary.bigSuccess || state.feedbackEffects?.includes('confetti')
    ? '<div class="confetti-burst" aria-hidden="true"><span>🎉</span><span>🏆</span><span>🎊</span><span>⭐</span><span>🎉</span></div>'
    : '';

  if (!summary.isComplete) {
    return `
      <div class="season-end-view">
        <article class="season-end-hero">
          <p class="eyebrow">Saisonabschluss</p>
          <h2>Die Saison läuft noch.</h2>
          <p>Simuliere alle verbleibenden Partien des letzten Spieltags, damit die Abschlussauswertung erscheint.</p>
          <button data-view="Spieltag" type="button">Zurück zum Spieltag</button>
        </article>
      </div>
    `;
  }

  return `
    <div class="season-end-view">
      ${confetti}
      <article class="season-end-hero ${summary.bigSuccess ? 'season-end-hero-success' : ''}">
        <p class="eyebrow">Saisonabschluss</p>
        <h2>${summary.bigSuccess ? 'Was für eine Saison!' : 'Saison beendet'}</h2>
        <p>
          ${state.selectedClub.name} beendet die Spielzeit auf <strong>${finalPosition}</strong>.
          ${summary.goalAchieved ? 'Das Saisonziel ist geschafft – die Fans feiern dich!' : 'Das Saisonziel wurde diesmal verpasst, aber die nächste Chance wartet.'}
        </p>
        <div class="season-end-actions">
          <button data-season-action="new-season" type="button">Neue Saison starten</button>
          <button data-season-action="hall-of-fame" type="button">Hall of Fame ansehen</button>
        </div>
      </article>

      <section class="season-end-grid">
        <article class="season-end-card highlight-card">
          <span>Finale Position</span>
          <strong>${finalPosition}</strong>
          <small>${summary.userRow ? `${summary.userRow.points} Punkte, ${summary.userRow.goalsFor}:${summary.userRow.goalsAgainst} Tore` : 'Keine Tabellenzeile gefunden'}</small>
        </article>
        <article class="season-end-card ${summary.goalAchieved ? 'success-card' : ''}">
          <span>Saisonziel</span>
          <strong>${summary.goalAchieved ? 'Erreicht' : 'Verpasst'}</strong>
          <small>${goalResult}</small>
        </article>
        <article class="season-end-card">
          <span>Meister</span>
          <strong>${summary.champion?.club ?? 'Unbekannt'}</strong>
          <small>${summary.champion ? `${summary.champion.points} Punkte` : 'Keine Tabelle verfügbar'}</small>
        </article>
      </section>

      <section class="season-end-lists">
        <article>
          <h3>Aufsteiger</h3>
          <ul>${renderTeamList(summary.promoted, state.currentLeague === '2. Bundesliga' ? 'Keine Aufsteiger ermittelt.' : 'In dieser Liga werden keine Aufsteiger ausgespielt.')}</ul>
        </article>
        <article>
          <h3>Relegation & Abstieg</h3>
          <ul>
            ${renderTeamList(summary.relegation, 'Keine Relegation ermittelt.')}
            ${renderTeamList(summary.relegated, 'Keine Absteiger ermittelt.')}
          </ul>
        </article>
        <article>
          <h3>Torschützenkönig</h3>
          <ul>${renderTopScorers(summary.topScorers)}</ul>
        </article>
        <article>
          <h3>Freigeschaltete Erfolge</h3>
          <ul class="season-achievements">${renderAchievements(summary.unlockedAchievements)}</ul>
        </article>
      </section>
    </div>
  `;
}
