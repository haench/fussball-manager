import { formatBudget } from '../utils/format.js';

export function renderTransfers(state) {
  return `
    <div>
      <p class="eyebrow">Markt</p>
      <h2>Transfers</h2>
      <p>Verfügbares Transferbudget: <strong>${formatBudget(state.budget)}</strong></p>
      <div class="transfer-list">
        <article>
          <strong>Junger Flügelspieler</strong>
          <span>5.000.000 €</span>
        </article>
        <article>
          <strong>Erfahrener Innenverteidiger</strong>
          <span>3.200.000 €</span>
        </article>
      </div>
    </div>
  `;
}
