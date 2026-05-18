import { positionLabels } from "../state.js";

export function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE").format(value) + " €";
}

export function formatStrength(value) {
  return Math.round(value);
}

export function formatSignedCurrency(value) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

export function formatPosition(position) {
  return positionLabels[position] ?? position;
}

export function formatShortPosition(position) {
  return {
    goalkeeper: "TW",
    defender: "VT",
    midfielder: "MF",
    striker: "ST"
  }[position] ?? position;
}
