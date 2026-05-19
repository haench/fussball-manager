import { getTeamById } from "../leagueWorld.js";
import { getCrest } from "../ui/viewHelpers.js";
import goalSplashImage from "../../assets/Tor.png";

export const tacticButtons = [
  { id: "aggressive", label: "Aggressiv", testId: "tactic-aggressive" },
  { id: "normal", label: "Normal", testId: "tactic-normal" },
  { id: "defensive", label: "Defensiv", testId: "tactic-defensive" }
];

export function toPercent(value) {
  return `${value * 100}%`;
}

function renderMatchMarkers(markers, teamClass, teamName) {
  return markers
    .map((marker, index) => {
      return `
        <div
          class="player-marker ${teamClass} ${index === 0 ? "player-marker--goalkeeper" : ""}"
          data-team="${teamName}"
          data-player-index="${index}"
          style="left:${toPercent(marker.x)}; top:${toPercent(marker.y)};"
        ></div>
      `;
    })
    .join("");
}

export function renderGoalSplash(match) {
  if (!match.goalSplash) {
    return "";
  }

  return `
    <div class="goal-splash" data-testid="goal-splash" data-team-name="${match.goalSplash.teamName}">
      <img class="goal-splash__image" src="${goalSplashImage}" alt="Tor!" />
      <div class="goal-splash__team">Tor für ${match.goalSplash.teamName}</div>
    </div>
  `;
}

function renderTacticButtons(activeTactic) {
  return tacticButtons
    .map((button) => `
      <button
        class="tactic-button ${activeTactic === button.id ? "tactic-button--active" : ""}"
        data-action="set-tactic"
        data-tactic="${button.id}"
        data-testid="${button.testId}"
        aria-pressed="${activeTactic === button.id}"
      >
        ${button.label}
      </button>
    `)
    .join("");
}

export function renderMatchScreen(state) {
  const match = state.match;
  if (!match) {
    return "";
  }
  const homeTeam = match.homeTeamId ? getTeamById(state, match.homeTeamId) : state.team;
  const awayTeam = match.awayTeamId ? getTeamById(state, match.awayTeamId) : state.opponent;
  const homeName = match.homeTeamName ?? homeTeam?.name ?? state.clubName;
  const awayName = match.awayTeamName ?? awayTeam?.name ?? state.opponent.name;

  return `
    <section class="screen screen--match">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--wide" data-testid="match-screen">
        <header class="scoreboard glossy-panel" data-testid="scoreboard">
          <div class="scoreboard__team">
            <span class="scoreboard__crest">${getCrest(homeTeam)}</span>
            <span>${homeName}</span>
          </div>
          <div class="scoreboard__score" data-testid="score-value">${match.homeGoals} - ${match.awayGoals}</div>
          <div class="scoreboard__team scoreboard__team--right">
            <span>${awayName}</span>
            <span class="scoreboard__crest scoreboard__crest--away">${getCrest(awayTeam)}</span>
          </div>
          <div class="scoreboard__meta">
            <div class="scoreboard__minute" data-testid="minute-value">${match.displayMinute}'</div>
            <div class="scoreboard__attendance" data-testid="attendance-value">👥 ${match.attendance ?? 0}</div>
          </div>
        </header>

        <section class="ticker-stack" data-testid="ticker-stack">
          ${match.tickerEvents.length
            ? match.tickerEvents.map((event) => `<article class="ticker-row glossy-panel">${event}</article>`).join("")
            : `<article class="ticker-row ticker-row--empty glossy-panel">Noch keine Tore</article>`}
        </section>

        <section class="pitch glossy-panel" data-testid="pitch">
          <div class="pitch__frame">
            <div class="pitch__line pitch__line--half"></div>
            <div class="pitch__circle"></div>
            <div class="pitch__box pitch__box--top"></div>
            <div class="pitch__box pitch__box--bottom"></div>
            <div class="pitch__goal pitch__goal--top"></div>
            <div class="pitch__goal pitch__goal--bottom"></div>
            ${renderMatchMarkers(match.positions.away, "player-marker--away", "away")}
            ${renderMatchMarkers(match.positions.home, "player-marker--home", "home")}
            <div class="ball-marker" data-testid="ball-marker" style="left:${toPercent(match.positions.ball.x)}; top:${toPercent(match.positions.ball.y)};"></div>
            ${renderGoalSplash(match)}
          </div>
        </section>

        <footer class="tactic-bar">
          ${renderTacticButtons(match.tactic)}
          <button
            class="action-button action-button--blue tactic-bar__skip"
            data-action="skip-match"
            data-testid="skip-match-button"
          >
            Überspringen
          </button>
        </footer>
      </div>
    </section>
  `;
}

function renderScorerList(match, state) {
  if (!match.scorers.length) {
    return `<p class="result-card__scorers">Keine Tore in diesem Spiel.</p>`;
  }

  const homeTeam = match.homeTeamId ? getTeamById(state, match.homeTeamId) : state.team;
  const fallbackNames = homeTeam?.players?.filter((player) => player.isStarter).map((player) => player.name) ?? [];
  const awayName = match.awayTeamName ?? state.opponent.name;
  return `
    <ul class="result-card__scorers">
      ${match.scorers
        .slice(0, 3)
        .map((entry, index) => {
          const scorerName = entry.name ?? (entry.team === "home"
            ? fallbackNames[index % fallbackNames.length]
            : `${awayName} ${index + 1}`);
          return `<li>${entry.minute}' ${scorerName}</li>`;
        })
        .join("")}
    </ul>
  `;
}

export function renderResultScreen(state) {
  const match = state.match;
  if (!match?.result) {
    return "";
  }
  const homeTeam = match.homeTeamId ? getTeamById(state, match.homeTeamId) : state.team;
  const awayTeam = match.awayTeamId ? getTeamById(state, match.awayTeamId) : state.opponent;
  const homeName = match.homeTeamName ?? homeTeam?.name ?? state.clubName;
  const awayName = match.awayTeamName ?? awayTeam?.name ?? state.opponent.name;

  return `
    <section class="screen screen--result screen--result-${match.result.tone}">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell" data-testid="result-screen">
        <div class="result-hero" data-testid="result-hero">
          <h1>${match.result.headline}</h1>
        </div>

        <section class="result-card glossy-panel">
          <div class="result-card__teams">
            <div>${homeName}</div>
            <div>${awayName}</div>
          </div>
          <div class="result-card__score" data-testid="result-score">${match.homeGoals} - ${match.awayGoals}</div>
          ${renderScorerList(match, state)}
          <div class="result-stats">
            <div class="result-stat">
              <span>Ballbesitz</span>
              <strong>${match.stats.homePossession}% - ${match.stats.awayPossession}%</strong>
            </div>
            <div class="result-stat">
               <span>Torschüsse</span>
              <strong>${match.stats.homeShots} - ${match.stats.awayShots}</strong>
            </div>
          </div>
        </section>

        <button class="action-button action-button--green" data-action="continue" data-testid="continue-button">Weiter</button>
      </div>
    </section>
  `;
}
