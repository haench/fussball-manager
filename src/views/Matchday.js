export function renderMatchday(state) {
  return `
    <div>
      <p class="eyebrow">Saison</p>
      <h2>Spieltag ${state.currentMatchday}</h2>
      <p>
        Dein nächstes Spiel steht an. Prüfe Aufstellung, Form und Transferoptionen, bevor du die Partie simulierst.
      </p>
      <div class="fixture-card">
        <strong>${state.selectedClub.name}</strong>
        <span>vs.</span>
        <strong>Nächster Gegner</strong>
      </div>
    </div>
  `;
}
