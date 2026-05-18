import { uiCopy } from "../config.js";

const logoImage = "./assets/logo.png";

export function renderStartScreen() {
  return `
    <section class="screen screen--start">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell" data-testid="start-screen">
        <img class="hero-logo" src="${logoImage}" alt="Fussball Manager" />
        <div class="hero-copy">
          <h1>Der erste Club wartet auf dich.</h1>
          <p>${uiCopy.clubTagline}</p>
        </div>
        <div class="cta-stack">
          <button class="action-button action-button--green" data-action="start-new" data-testid="start-game-button">Spiel starten</button>
          <button class="action-button action-button--blue" data-action="show-club" data-testid="club-screen-button">Fortfahren</button>
        </div>
      </div>
    </section>
  `;
}
