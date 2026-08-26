import questionsJson from './questions.json';
import mapJson from './map.json';

export type Question = { id: string; q: string; o: string[]; c: number[]; e: string; t: number; card?: string };
export type MapItem = { html?: string; text: string; yr?: string; n?: string; label?: string };
export type MapCard = { id: string; title: string; kind: 'list' | 'rail' | 'numbers' | 'table'; items: MapItem[]; cues: string[]; head?: string[]; rows?: string[][] };
export type MapSection = { id: string; title: string; color: string; note: string; topic: number | null; cards: MapCard[] };

export const QUESTIONS = questionsJson as Question[];
export const MAP = mapJson as MapSection[];
export const TOPICS = ['Values', 'UK & Geography', 'History', 'Government', 'Law', 'Culture & Sport'];
export const TOPIC_COLORS = ['cyan', 'green', 'red', 'blue', 'magenta', 'orange'];
export const BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
export const CARD_BY_ID: Record<string, { section: MapSection; card: MapCard }> = Object.fromEntries(
	MAP.flatMap((s) => s.cards.map((c) => [c.id, { section: s, card: c }]))
);
