function renderNewsItems(newsItems) {
  if (!newsItems.length) {
    return '<p class="friendly-copy">Noch keine Nachrichten. Nach dem ersten Spieltag füllt sich die Zentrale.</p>';
  }

  return newsItems
    .map(
      (item) => `
        <article class="news-item news-${item.type}">
          <small>${item.matchday > 0 ? `Spieltag ${item.matchday}` : 'Saisonstart'}</small>
          <h4>${item.title}</h4>
          <p>${item.text}</p>
        </article>
      `,
    )
    .join('');
}

export function renderNewsCenter(newsItems = []) {
  return `
    <section class="news-center" aria-labelledby="news-center-title">
      <div class="section-heading">
        <p class="eyebrow">Nachrichten-Zentrale</p>
        <h3 id="news-center-title">Was rund um den Verein passiert</h3>
      </div>
      <div class="news-list">${renderNewsItems(newsItems)}</div>
    </section>
  `;
}
