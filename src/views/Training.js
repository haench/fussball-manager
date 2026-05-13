import { trainingFocusOptions } from '../game/training.js';

function moodSymbol(player) {
  if ((player.morale ?? 60) >= 70) return '😊 gute Moral';
  if ((player.morale ?? 60) < 45) return '😟 unzufrieden';
  return '😐 normal';
}

function fitnessSymbol(player) {
  return (player.fitness ?? 80) >= 72 ? '⚡ fit' : '🪫 müde';
}

function formSymbol(player) {
  return (player.form ?? 55) >= 72 ? '🔥 Topform' : '😐 normal';
}

function renderFocusOptions(currentFocus) {
  return trainingFocusOptions
    .map(
      (option) => `
        <label class="training-option ${option.value === currentFocus ? 'active' : ''}">
          <input type="radio" name="training-focus" value="${option.value}" data-training-focus ${option.value === currentFocus ? 'checked' : ''}>
          <strong>${option.label}</strong>
          <span>${option.description}</span>
        </label>
      `,
    )
    .join('');
}

function renderTrainingMessages(messages) {
  if (!messages.length) {
    return '<li>Noch keine Trainingsmeldung.</li>';
  }

  return messages.map((message) => `<li>${message}</li>`).join('');
}

function renderMoodCards(squad) {
  return squad
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (player) => `
        <article class="mood-card">
          <strong>${player.name}</strong>
          <span>${player.position} · Stärke ${player.strength}</span>
          <div class="symbol-list" aria-label="Form Fitness Moral von ${player.name}">
            <span>${formSymbol(player)}</span>
            <span>${fitnessSymbol(player)}</span>
            <span>${moodSymbol(player)}</span>
          </div>
        </article>
      `,
    )
    .join('');
}

export function renderTraining(state) {
  return `
    <div class="training-view">
      <div class="section-heading">
        <p class="eyebrow">Wochenplan</p>
        <h2>Training</h2>
        <p class="friendly-copy">
          Wähle einen einfachen Fokus für die Trainingswoche. Nach Spielen verändern sich Form, Fitness und Moral.
        </p>
      </div>

      <section class="training-planner" aria-label="Trainingsfokus planen">
        <div>
          <p class="eyebrow">Aktueller Fokus</p>
          <h3>${state.trainingFocus}</h3>
        </div>
        <button data-training-auto type="button">Training automatisch planen</button>
      </section>

      <section class="training-options" aria-label="Trainingsfokus auswählen">
        ${renderFocusOptions(state.trainingFocus)}
      </section>

      <section class="message-card">
        <h3>Trainingsmeldungen</h3>
        <ul>${renderTrainingMessages(state.trainingMessages)}</ul>
      </section>

      <section>
        <h3>Stimmung im Team</h3>
        <div class="mood-grid">${renderMoodCards(state.squad)}</div>
      </section>
    </div>
  `;
}
