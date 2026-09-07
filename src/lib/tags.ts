export const DEFAULT_TAG_SUGGESTIONS = [
  'Chronic',
  'Follow-up',
  'Consultation',
  'First Visit',
  'Herbal Regimen',
  'VIP'
];

interface TagStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

const PRESET_STYLES: Record<string, TagStyle> = {
  'chronic': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500'
  },
  'follow-up': {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    dot: 'bg-sky-500'
  },
  'consultation': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500'
  },
  'first visit': {
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    border: 'border-violet-200',
    dot: 'bg-violet-500'
  },
  'herbal regimen': {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    dot: 'bg-teal-500'
  },
  'vip': {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500'
  }
};

const PALETTE: TagStyle[] = [
  { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-800', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500' },
  { bg: 'bg-lime-50', text: 'text-lime-800', border: 'border-lime-200', dot: 'bg-lime-600' },
  { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500' },
  { bg: 'bg-zinc-100', text: 'text-zinc-800', border: 'border-zinc-200', dot: 'bg-zinc-500' },
];

export function getTagStyle(tag: string): TagStyle {
  const normalized = tag.trim().toLowerCase();
  if (PRESET_STYLES[normalized]) {
    return PRESET_STYLES[normalized];
  }
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
