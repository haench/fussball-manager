export function renderLineup(state) {
  const starters = state.squad
    .slice(0, 5)
    .map((player) => `<span>${player.position}: ${player.name}</span>`)
    .join('');

  return `
    <div>
      <p class="eyebrow">Taktik</p>
      <h2>Aufstellung</h2>
      <p>Eine einfache 1-2-1-1-Grundordnung ist voreingestellt.</p>
      <div class="pitch">${starters}</div>
    </div>
  `;
}
