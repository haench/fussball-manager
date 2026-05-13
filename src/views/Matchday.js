import { getCurrentMatchdayViewModel } from '../game/state.js';

function renderFixtureList(fixtures) {
  return fixtures
    .map(
      (fixture) => `
        <div class="fixture-card ${fixture.isUserMatch ? 'highlight-fixture' : ''}">
          <strong>${fixture.homeTeam}</strong>
          <span>vs.</span>
          <strong>${fixture.awayTeam}</strong>
          ${fixture.isUserMatch ? '<small>Dein Spiel</small>' : ''}
        </div>
      `,
    )
    .join('');
}

function renderResultList(results) {
  if (results.length === 0) {
    return '<p class="friendly-copy">Noch keine Ergebnisse an diesem Spieltag.</p>';
  }

  return results
    .map(
      (match) => `
        <article class="result-card">
          <div>
            <strong>${match.homeTeam} ${match.homeGoals}:${match.awayGoals} ${match.awayTeam}</strong>
            <p>${match.summary}</p>
          </div>
          <small>${match.scorers.map((scorer) => scorer.name).join(', ') || 'Keine Tore'}</small>
        </article>
      `,
    )
    .join('');
}

function renderTicker(match) {
  if (!match) {
    return '<p class="friendly-copy">Klicke auf „Mein Spiel live ansehen“, um den Live-Ticker für deine Partie zu öffnen.</p>';
  }

  const events = match.tickerEvents
    .map((event) => `<li><strong>${event.minute}'.</strong> ${event.text}</li>`)
    .join('');

  return `
    <div class="ticker-card">
      <h3>${match.homeTeam} ${match.homeGoals}:${match.awayGoals} ${match.awayTeam}</h3>
      <ul>${events}</ul>
    </div>
  `;
}

export function renderMatchday(state) {
  const { fixtures } = getCurrentMatchdayViewModel(state);
  const completedIds = new Set(state.completedMatches.map((match) => match.id));
  const hasCompletedUserMatch = fixtures.some((fixture) => fixture.isUserMatch && completedIds.has(fixture.id));
  const hasRemainingMatches = fixtures.some((fixture) => !completedIds.has(fixture.id));
  const simulateMatchdayLabel = hasCompletedUserMatch ? 'Restliche Spiele simulieren' : 'Spieltag simulieren';
  const simulateMatchdayDisabled = !hasRemainingMatches ? ' disabled' : '';

  return `
    <div class="matchday-view">
      <div>
        <p class="eyebrow">Saison</p>
        <h2>Spieltag ${state.currentMatchday}</h2>
        <p>
          Simuliere den kompletten Spieltag sofort oder verfolge erst dein eigenes Spiel im Live-Ticker.
          Ergebnisse basieren auf Teamstärke, aktueller Form, Heimvorteil und Taktik.
        </p>
      </div>

      <div class="matchday-actions">
        <button data-action="simulate-matchday" type="button"${simulateMatchdayDisabled}>${simulateMatchdayLabel}</button>
        <button data-action="watch-live" type="button">Mein Spiel live ansehen</button>
        <button data-action="simulate-remaining" type="button"${simulateMatchdayDisabled}>Restliche Spiele simulieren</button>
      </div>

      <section>
        <h3>Ansetzungen</h3>
        <div class="fixture-list">${renderFixtureList(fixtures)}</div>
      </section>

      <section>
        <h3>Letzte Ergebnisse</h3>
        <div class="result-list">${renderResultList(state.latestMatchdayResults)}</div>
      </section>

      <section>
        <h3>Live-Ticker</h3>
        ${renderTicker(state.liveMatch)}
      </section>
    </div>
  `;
}
