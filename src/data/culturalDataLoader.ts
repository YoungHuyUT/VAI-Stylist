import {
  Costume,
  ColorEntry,
  Pattern,
  Accessory,
  Rule,
  LoreCard,
  Source,
  CulturalDataSet,
} from '../types/costume';

import sourcesJson from './sources.json';
import costumesJson from './costumes.json';
import colorsJson from './colors.json';
import patternsJson from './patterns.json';
import accessoriesJson from './accessories.json';
import rulesJson from './rules.json';
import loreJson from './lore.json';

export const culturalData: CulturalDataSet = {
  sources: sourcesJson as Record<string, Source>,
  costumes: costumesJson as Record<string, Costume>,
  colors: colorsJson as Record<string, ColorEntry>,
  patterns: patternsJson as Record<string, Pattern>,
  accessories: accessoriesJson as Record<string, Accessory>,
  rules: rulesJson as Rule[],
  loreCards: loreJson as LoreCard[],
};

export function getCostume(id: string): Costume | undefined {
  return culturalData.costumes[id];
}

export function getColor(id: string): ColorEntry | undefined {
  return culturalData.colors[id];
}

export function getPattern(id: string): Pattern | undefined {
  return culturalData.patterns[id];
}

export function getAccessory(id: string): Accessory | undefined {
  return culturalData.accessories[id];
}

export function getSource(id: string): Source | undefined {
  return culturalData.sources[id];
}

export function getLoreForCostume(costumeId: string): LoreCard[] {
  return culturalData.loreCards.filter((card) => card.costumeId === costumeId);
}
