import assert from 'node:assert/strict';

import { createSeasonSchedule } from '../src/game/schedule.js';
import { getTableZone } from '../src/game/table.js';
import { fantasyTeams, teamsByLeague, TEAMS_PER_LEAGUE } from '../src/data/teams.js';
import { players } from '../src/data/players.js';

const bundesligaTeams = teamsByLeague.Bundesliga;
const secondBundesligaTeams = teamsByLeague['2. Bundesliga'];
const bundesligaSchedule = createSeasonSchedule(bundesligaTeams);

assert.equal(TEAMS_PER_LEAGUE, 18, 'Die Zielgröße pro Liga bleibt bei 18 Teams.');
assert.equal(bundesligaTeams.length, 18, 'Bundesliga hat 18 Teams.');
assert.equal(secondBundesligaTeams.length, 18, '2. Bundesliga hat 18 Teams.');
assert.equal(fantasyTeams.length, 36, 'Fantasy-Daten enthalten insgesamt 36 Teams.');
assert.equal(bundesligaSchedule.length, 34, 'Bundesliga-Saison hat 34 Spieltage.');
assert.equal(bundesligaSchedule[0].matches.length, 9, 'Spieltag 1 hat 9 Partien.');
assert.ok(
  bundesligaSchedule.every((matchday) => matchday.matches.length === 9),
  'Jeder Bundesliga-Spieltag hat 9 Partien.',
);

assert.deepEqual(getTableZone({ position: 1 }, 'Bundesliga'), { key: 'title', label: 'Meisterschaft' });
assert.deepEqual(getTableZone({ position: 6 }, 'Bundesliga'), { key: 'international', label: 'Internationale Plätze' });
assert.deepEqual(getTableZone({ position: 16 }, 'Bundesliga'), { key: 'relegation', label: 'Relegation' });
assert.deepEqual(getTableZone({ position: 17 }, 'Bundesliga'), { key: 'demotion', label: 'Abstieg' });
assert.deepEqual(getTableZone({ position: 2 }, '2. Bundesliga'), { key: 'promotion', label: 'Aufstieg' });
assert.deepEqual(getTableZone({ position: 3 }, '2. Bundesliga'), { key: 'relegation', label: 'Relegation' });
assert.deepEqual(getTableZone({ position: 16 }, '2. Bundesliga'), { key: 'demotion', label: 'Abstieg' });

for (const team of fantasyTeams) {
  assert.equal(
    players.filter((player) => player.teamId === team.id).length,
    18,
    `${team.name} hat einen Kader mit 18 Spielern.`,
  );
}
