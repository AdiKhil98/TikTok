export type Angle =
  | 'educational'
  | 'asmr'
  | 'hook-based'
  | 'comparison'
  | 'storytelling'
  | 'problem-solution';

export type Style = 'macro' | 'lifestyle' | 'cinematic' | 'minimalist';
export type Language = 'he' | 'en';

export interface GenerateScriptInput {
  product: string;
  angle: Angle;
  style: Style;
  language: Language;
  referenceNote?: string;
}

export interface CaptionBeat {
  startSec: number;
  endSec: number;
  text: string;
}

export interface GeneratedScript {
  hooks: string[];
  voScript: string;
  captions: CaptionBeat[];
  lumaPrompt: string;
  hashtags: string[];
}
