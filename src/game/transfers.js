import { players } from '../data/players.js';
import { teams } from '../data/teams.js';

export const transferResponses = {
  accepted: 'Der Verein akzeptiert.',
  moreWage: 'Der Spieler möchte mehr Gehalt.',
  moreFee: 'Der Verein verlangt 5 Mio. € mehr.',
  unwilling: 'Der Spieler möchte nicht wechseln.',
};

const fiveMillion = 5_000_000;
const teamsById = Object.fromEntries(teams.map((team) => [team.id, team]));

export const defaultTransferFilters = {
  name: '',
  position: '',
  minStrength: '',
  maxAge: '',
  maxPrice: '',
};

export function calculateCurrentWageSum(squad = []) {
  return squad.reduce((sum, player) => sum + player.salary, 0);
}

export function createInitialTransferFinances(club, squad) {
  const currentWageSum = calculateCurrentWageSum(squad);

  return {
    transferBudget: club.budget,
    budget: club.budget,
    wageBudget: Math.round(currentWageSum * 1.25),
    currentWageSum,
  };
}

export function createInitialPlayerTeamIds() {
  return Object.fromEntries(players.map((player) => [player.id, player.teamId]));
}

function normalizeNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeFilters(filters = {}) {
  return { ...defaultTransferFilters, ...filters };
}

function getPlayerTeamId(state, player) {
  return state.playerTeamIds?.[player.id] ?? player.teamId;
}

function getClubValue(teamId) {
  return teamsById[teamId]?.budget ?? 10_000_000;
}

function getAskingPrice(player, sellerTeamId) {
  const strengthBonus = Math.max(0, player.strength - 70) * 0.03;
  const talentBonus = Math.max(0, player.potential - player.strength) * 0.02;
  const youngBonus = player.age <= 23 ? 0.08 : 0;
  const richClubBonus = getClubValue(sellerTeamId) >= 50_000_000 ? 0.08 : 0;

  return Math.round(player.marketValue * (1.05 + strengthBonus + talentBonus + youngBonus + richClubBonus));
}

function getDesiredSalary(player) {
  const strengthBonus = Math.max(0, player.strength - 68) * 0.025;
  const peakAgeBonus = player.age >= 24 && player.age <= 29 ? 0.05 : 0;

  return Math.round(player.salary * (1.08 + strengthBonus + peakAgeBonus));
}

function playerIsUnwilling(player, sellerTeamId, buyerTeamId, wageOffer) {
  const sellerValue = getClubValue(sellerTeamId);
  const buyerValue = getClubValue(buyerTeamId);
  const desiredSalary = getDesiredSalary(player);
  const isStarOrWonderkid = player.strength >= 80 || (player.age <= 22 && player.potential >= 84);
  const bigStepDown = sellerValue > buyerValue * 1.65;

  return isStarOrWonderkid && bigStepDown && wageOffer < desiredSalary * 1.25;
}

export function getTransferMarketPlayers(state, filters = state.transferFilters) {
  const activeFilters = normalizeFilters(filters);
  const name = activeFilters.name.trim().toLocaleLowerCase('de-DE');
  const minStrength = normalizeNumber(activeFilters.minStrength);
  const maxAge = normalizeNumber(activeFilters.maxAge);
  const maxPrice = normalizeNumber(activeFilters.maxPrice);

  return players
    .filter((player) => getPlayerTeamId(state, player) !== state.selectedClub?.id)
    .filter((player) => !name || player.name.toLocaleLowerCase('de-DE').includes(name))
    .filter((player) => !activeFilters.position || player.position === activeFilters.position)
    .filter((player) => minStrength === null || player.strength >= minStrength)
    .filter((player) => maxAge === null || player.age <= maxAge)
    .filter((player) => maxPrice === null || getAskingPrice(player, getPlayerTeamId(state, player)) <= maxPrice)
    .map((player) => {
      const teamId = getPlayerTeamId(state, player);

      return {
        ...player,
        teamId,
        clubName: teamsById[teamId]?.name ?? 'Transfermarkt',
        askingPrice: getAskingPrice(player, teamId),
        desiredSalary: getDesiredSalary(player),
      };
    })
    .sort((a, b) => b.strength - a.strength || a.age - b.age || a.name.localeCompare(b.name));
}

export function evaluateTransferOffer(state, playerId, offer = {}) {
  const player = players.find((entry) => entry.id === playerId);

  if (!player || !state.selectedClub) {
    return { accepted: false, response: 'Der Spieler wurde nicht gefunden.' };
  }

  const sellerTeamId = getPlayerTeamId(state, player);
  const feeOffer = normalizeNumber(offer.fee) ?? 0;
  const wageOffer = normalizeNumber(offer.salary) ?? 0;
  const askingPrice = getAskingPrice(player, sellerTeamId);
  const desiredSalary = getDesiredSalary(player);

  if (feeOffer > state.transferBudget) {
    return { accepted: false, response: 'Dein Transferbudget reicht nicht.' };
  }

  if (state.currentWageSum + wageOffer > state.wageBudget) {
    return { accepted: false, response: 'Dein Gehaltsbudget reicht nicht.' };
  }

  if (playerIsUnwilling(player, sellerTeamId, state.selectedClub.id, wageOffer)) {
    return { accepted: false, response: transferResponses.unwilling, askingPrice, desiredSalary };
  }

  if (wageOffer < desiredSalary) {
    return { accepted: false, response: transferResponses.moreWage, askingPrice, desiredSalary };
  }

  if (feeOffer < askingPrice) {
    return {
      accepted: false,
      response: transferResponses.moreFee,
      askingPrice: askingPrice + fiveMillion,
      desiredSalary,
    };
  }

  return { accepted: true, response: transferResponses.accepted, askingPrice, desiredSalary };
}

export function buyPlayer(state, playerId, offer = {}) {
  const evaluation = evaluateTransferOffer(state, playerId, offer);

  if (!evaluation.accepted) return evaluation;

  const player = players.find((entry) => entry.id === playerId);
  const feeOffer = normalizeNumber(offer.fee) ?? evaluation.askingPrice;
  const wageOffer = normalizeNumber(offer.salary) ?? evaluation.desiredSalary;
  const signedPlayer = {
    ...player,
    teamId: state.selectedClub.id,
    salary: wageOffer,
  };

  state.squad = [...state.squad, signedPlayer];
  state.playerTeamIds[playerId] = state.selectedClub.id;
  state.transferBudget -= feeOffer;
  state.budget = state.transferBudget;
  state.currentWageSum = calculateCurrentWageSum(state.squad);
  state.messages = [`${signedPlayer.name} unterschreibt bei ${state.selectedClub.name}.`, evaluation.response, ...state.messages].slice(0, 6);

  return { ...evaluation, player: signedPlayer };
}

export function sellPlayer(state, playerId) {
  const player = state.squad.find((entry) => entry.id === playerId);

  if (!player) {
    return { accepted: false, response: 'Der Spieler ist nicht in deinem Kader.' };
  }

  const salePrice = Math.round(player.marketValue * (player.age > 30 ? 0.85 : 0.95));

  state.squad = state.squad.filter((entry) => entry.id !== playerId);
  state.playerTeamIds[playerId] = 'transfermarkt';
  state.transferBudget += salePrice;
  state.budget = state.transferBudget;
  state.currentWageSum = calculateCurrentWageSum(state.squad);
  state.messages = [`${player.name} wurde für ${salePrice.toLocaleString('de-DE')} € verkauft.`, ...state.messages].slice(0, 6);

  return { accepted: true, response: 'Verkauft!', salePrice, player };
}
