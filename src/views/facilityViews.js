import {
  getTrainingUpgradeCost,
  getTrainingUpgradeDuration,
  getTrainingUpgradeTargetLevel,
  getYouthUpgradeCost,
  getYouthUpgradeDuration,
  getYouthUpgradeTargetLevel,
  trainingUpgradeConfig,
  youthAcademyConfig
} from "../state.js";
import { formatCurrency, formatShortPosition } from "../ui/formatters.js";
import { getCrest } from "../ui/viewHelpers.js";
import { getUserTeam } from "../leagueWorld.js";
import { renderTrainingMessages } from "./clubView.js";

function getDisplayTeam(state) {
  return getUserTeam(state) ?? state.team;
}

export function renderTrainingScreen(state) {
  const facility = state.team.trainingFacility;
  const upgrade = facility.upgradeInProgress;
  const targetLevel = getTrainingUpgradeTargetLevel(state);
  const upgradeCost = getTrainingUpgradeCost(facility.level, targetLevel);
  const upgradeDuration = getTrainingUpgradeDuration(facility.level, targetLevel);
  const canUpgrade = !upgrade && facility.level < trainingUpgradeConfig.maxLevel && state.money >= upgradeCost;
  const canDecreaseTarget = !upgrade && targetLevel > facility.level + 1;
  const canIncreaseTarget = !upgrade && targetLevel < trainingUpgradeConfig.maxLevel;
  const progressPercent = upgrade
    ? Math.round(((upgrade.totalDays - upgrade.daysRemaining) / upgrade.totalDays) * 100)
    : 0;

  return `
    <section class="screen screen--club screen--training">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="training-screen">
        <header class="club-header club-header--roster glossy-panel">
          <div class="club-header__crest">FFC</div>
          <div class="club-header__main">
            <div class="eyebrow">Training</div>
            <h1>${state.clubName}</h1>
            <p>Spielerentwicklung steuern</p>
          </div>
          <div class="club-header__strength">
            <span>Level</span>
            <strong>${facility.level}</strong>
          </div>
        </header>

        <section class="training-card glossy-panel">
          <div class="training-card__headline">
            <span>Trainingsanlage</span>
            <strong>${facility.level}/${trainingUpgradeConfig.maxLevel}</strong>
          </div>
          <p>Spieler können nur bis zur Stärke deiner Trainingsanlage wachsen.</p>
          ${upgrade ? `
            <div class="training-progress" data-testid="training-progress">
              <div class="training-progress__bar">
                <span style="width:${progressPercent}%"></span>
              </div>
              <strong>Ausbau auf Level ${upgrade.targetLevel}: ${upgrade.daysRemaining} Spieltage verbleibend</strong>
            </div>
          ` : `
            <div class="training-upgrade">
              <div class="training-target-control" data-testid="training-target-control">
                <button class="training-target-control__button" data-action="change-training-target" data-delta="-1" ${canDecreaseTarget ? "" : "disabled"}>-1</button>
                <div class="training-target-control__level">
                  <span>Ziel</span>
                  <strong>Level ${targetLevel}</strong>
                </div>
                <button class="training-target-control__button" data-action="change-training-target" data-delta="1" ${canIncreaseTarget ? "" : "disabled"}>+1</button>
              </div>
              <div class="training-upgrade__meta">
                <span>Kosten: ${formatCurrency(upgradeCost)}</span>
                <span>Bauzeit: ${upgradeDuration} Spieltag${upgradeDuration === 1 ? "" : "e"}</span>
              </div>
            </div>
          `}
          <button
            class="action-button action-button--green training-upgrade__button"
            data-action="upgrade-training"
            data-testid="upgrade-training-button"
            ${canUpgrade ? "" : "disabled"}
          >
            Trainingsanlage verbessern
          </button>
        </section>

        ${renderTrainingMessages(state.trainingMessages)}

        <button class="action-button action-button--blue roster-action" data-action="back-club" data-testid="back-club-button">Zurück</button>
      </div>
    </section>
  `;
}

function renderYouthOffer(offer) {
  if (!offer) {
    return `
      <section class="youth-offer glossy-panel" data-testid="youth-empty">
        <div class="eyebrow">Talentsuche</div>
        <p>Aktuell kein Jugendspieler entdeckt.</p>
      </section>
    `;
  }

  return `
    <section class="youth-offer glossy-panel" data-testid="youth-offer">
      <div class="eyebrow">Neuer Jugendspieler entdeckt!</div>
      <h2>${offer.name}</h2>
      <div class="youth-offer__stats">
        <span>${formatShortPosition(offer.position)}</span>
        <span>${offer.age} Jahre</span>
        <span>Stärke ${offer.strength}</span>
        <span>${formatCurrency(offer.salaryPerMatchDay)} / Spieltag</span>
      </div>
      <p>In den Kader übernehmen?</p>
      <div class="roster-actions">
        <button class="action-button action-button--green roster-action" data-action="accept-youth" data-testid="accept-youth-button">Übernehmen</button>
        <button class="action-button action-button--blue roster-action" data-action="reject-youth" data-testid="reject-youth-button">Ablehnen</button>
      </div>
    </section>
  `;
}

export function renderYouthScreen(state) {
  const userTeam = getDisplayTeam(state);
  const academy = state.team.youthAcademy;
  const upgrade = academy.upgradeInProgress;
  const targetLevel = getYouthUpgradeTargetLevel(state);
  const upgradeCost = getYouthUpgradeCost(academy.level, targetLevel);
  const upgradeDuration = getYouthUpgradeDuration(academy.level, targetLevel);
  const canUpgrade = !upgrade && academy.level < youthAcademyConfig.maxLevel && state.money >= upgradeCost;
  const canDecreaseTarget = !upgrade && targetLevel > academy.level + 1;
  const canIncreaseTarget = !upgrade && targetLevel < youthAcademyConfig.maxLevel;
  const progressPercent = upgrade
    ? Math.round(((upgrade.totalDays - upgrade.daysRemaining) / upgrade.totalDays) * 100)
    : 0;

  return `
    <section class="screen screen--club screen--youth">
      <div class="screen__backdrop"></div>
      <div class="mobile-shell mobile-shell--roster" data-testid="youth-screen">
        <header class="club-header club-header--roster glossy-panel">
          <div class="club-header__crest">${getCrest(userTeam)}</div>
          <div class="club-header__main">
            <div class="eyebrow">Jugend</div>
            <h1>${userTeam.name}</h1>
            <p>Talente entwickeln</p>
          </div>
          <div class="club-header__strength">
            <span>Level</span>
            <strong>${academy.level}</strong>
          </div>
        </header>

        <section class="training-card glossy-panel">
          <div class="training-card__headline">
            <span>Jugendzentrum</span>
            <strong>${academy.level}/${youthAcademyConfig.maxLevel}</strong>
          </div>
          <p>Je besser dein Jugendzentrum ist, desto stärker können entdeckte Talente sein.</p>
          ${upgrade ? `
            <div class="training-progress" data-testid="youth-progress">
              <div class="training-progress__bar">
                <span style="width:${progressPercent}%"></span>
              </div>
              <strong>Ausbau auf Level ${upgrade.targetLevel}: ${upgrade.daysRemaining} Spieltage verbleibend</strong>
            </div>
          ` : `
            <div class="training-upgrade">
              <div class="training-target-control" data-testid="youth-target-control">
                <button class="training-target-control__button" data-action="change-youth-target" data-delta="-1" ${canDecreaseTarget ? "" : "disabled"}>-1</button>
                <div class="training-target-control__level">
                  <span>Ziel</span>
                  <strong>Level ${targetLevel}</strong>
                </div>
                <button class="training-target-control__button" data-action="change-youth-target" data-delta="1" ${canIncreaseTarget ? "" : "disabled"}>+1</button>
              </div>
              <div class="training-upgrade__meta">
                <span>Kosten: ${formatCurrency(upgradeCost)}</span>
                <span>Bauzeit: ${upgradeDuration} Spieltag${upgradeDuration === 1 ? "" : "e"}</span>
              </div>
            </div>
          `}
          ${state.youthStatusMessage ? `<p class="training-status">${state.youthStatusMessage}</p>` : ""}
          <button
            class="action-button action-button--green training-upgrade__button"
            data-action="upgrade-youth"
            data-testid="upgrade-youth-button"
            ${canUpgrade ? "" : "disabled"}
          >
            Jugendzentrum verbessern
          </button>
        </section>

        ${renderYouthOffer(academy.pendingOffer)}

        <button class="action-button action-button--blue roster-action" data-action="back-club" data-testid="back-club-button">Zurück</button>
      </div>
    </section>
  `;
}
