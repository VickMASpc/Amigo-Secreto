import type { ParticipantId, UserRole } from '../types';

export interface ParticipantSeed {
  id: ParticipantId;
  baseName: string;
  role: UserRole;
  defaultAvatar: string;
  defaultColor: string;
}

export const PARTICIPANTS: ParticipantSeed[] = [
  {
    id: 'victor',
    baseName: 'Victor',
    role: 'admin',
    defaultAvatar: '🎄',
    defaultColor: '#B83B35',
  },
  {
    id: 'wellington',
    baseName: 'Wellington',
    role: 'member',
    defaultAvatar: '🎁',
    defaultColor: '#214E3E',
  },
  {
    id: 'rosangela',
    baseName: 'Rosângela',
    role: 'member',
    defaultAvatar: '🌟',
    defaultColor: '#C8963E',
  },
  {
    id: 'bianca',
    baseName: 'Bianca',
    role: 'member',
    defaultAvatar: '✨',
    defaultColor: '#7A3E65',
  },
];

export const DEFAULT_DEADLINE_ISO = '2026-11-25T23:59:59-03:00';
export const DEFAULT_BUDGET = 150;

export const AVATAR_EMOJIS = [
  '🎄',
  '🎁',
  '🌟',
  '✨',
  '🦌',
  '⛄',
  '🧸',
  '☕',
  '🎧',
  '📚',
  '🎮',
  '🌿',
  '🍫',
  '🕯️',
  '🎨',
  '🐾',
];

export const ACCENT_COLORS = [
  { name: 'Terracota Natalino', hex: '#B83B35' },
  { name: 'Verde Pinheiro', hex: '#214E3E' },
  { name: 'Dourado Quente', hex: '#C8963E' },
  { name: 'Ameixa', hex: '#7A3E65' },
  { name: 'Azul Ardósia', hex: '#355C7D' },
  { name: 'Âmbar', hex: '#B86B2B' },
];
