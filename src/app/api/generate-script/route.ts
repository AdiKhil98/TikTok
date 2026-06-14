import { NextRequest, NextResponse } from 'next/server';
import { anthropic, SCRIPT_MODEL } from '@/lib/anthropic';
import type { GenerateScriptInput, GeneratedScript } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function buildPrompt(input: GenerateScriptInput): string {
  const langName = input.language === 'he' ? 'Hebrew' : 'English';
  const refNote = input.referenceNote
    ? `\nReference visual: ${input.referenceNote}`
    : '';

  return `You are a senior TikTok creative director for short-form product marketing.

Generate a complete script package for a single 8-second TikTok video.

Product: ${input.product}
Angle: ${input.angle}
Visual style: ${input.style}
Output language: ${langName}${refNote}

Requirements:
- 3 distinct hook variants (each <= 6 words, scroll-stopping)
- VO script: 2 short sentences max, total ~6-8 seconds of speech
- 5 caption beats covering 0-8 seconds, each beat has startSec, endSec, and short text
- One Luma Dream Machine prompt (English, regardless of output language) for the b-roll: specific about camera (lens, movement), lighting (direction, quality), subject texture, background. No text or hands in the visual.
- 5-8 relevant hashtags (no #, just words)

Return ONLY valid JSON matching this exact shape, no prose, no markdown fences:
{
  "hooks": ["...", "...", "..."],
  "voScript": "...",
  "captions": [
    { "startSec": 0, "endSec": 2, "text": "..." },
    { "startSec": 2, "endSec": 3.5, "text": "..." },
    { "startSec": 3.5, "endSec": 5, "text": "..." },
    { "startSec": 5, "endSec": 6.5, "text": "..." },
    { "startSec": 6.5, "endSec": 8, "text": "..." }
  ],
  "lumaPrompt": "...",
  "hashtags": ["...", "..."]
}`;
}

function extractJson(text: string): GeneratedScript {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in model response');
  return JSON.parse(match[0]) as GeneratedScript;
}

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as GenerateScriptInput;

    if (!input.product || !input.angle || !input.style || !input.language) {
      return NextResponse.json(
        { error: 'Missing required fields: product, angle, style, language' },
        { status: 400 },
      );
    }

    const message = await anthropic.messages.create({
      model: SCRIPT_MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildPrompt(input) }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content in model response');
    }

    const script = extractJson(textBlock.text);
    return NextResponse.json(script);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
