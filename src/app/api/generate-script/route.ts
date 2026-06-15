import { NextRequest, NextResponse } from 'next/server';
import { anthropic, SCRIPT_MODEL } from '@/lib/anthropic';
import type { GenerateScriptInput, GeneratedScript } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function buildPrompt(input: GenerateScriptInput): string {
  const refNote = input.referenceNote
    ? `\nReference visual: ${input.referenceNote}`
    : '';

  const hebrewVoiceRules = input.language === 'he' ? `

CRITICAL — Hebrew writing rules (you are writing as a native Israeli TikTok creator, not translating from English):
- Write in casual modern Israeli Hebrew, the kind real creators use on TikTok. Light slang is fine when natural.
- Do NOT translate from English. Think in Hebrew first. If a phrase feels like a calque (literal English→Hebrew), rewrite it the way an Israeli would actually say it out loud.
- Avoid stiff/marketing-translated phrases like "פשוט פותחים ונהנים" (sounds like ad copy translated from English).
- Each caption beat must be self-contained and make sense without context — never say "open" without saying what, never reference something the viewer can't see.
- VO sentences must sound natural when spoken aloud by a Hebrew voice. Read each one in your head — if a native speaker would not say it this way casually, rewrite it.
- Hooks should land in the gut. Concrete, surprising, or contrarian. Not generic claims.

Bad vs good example (freeze-dried strawberry):
- BAD: "פשוט פותחים ונהנים" (translated ad copy, vague — open what?)
- GOOD: "פותחים שקית, אוכלים, נגמר" (concrete, native rhythm)
- BAD: "הטעם האמיתי, כמוסה" (poetic-translated, unnatural)
- GOOD: "טעם של תות אמיתי, בלי המים" (concrete, conversational)` : '';

  return `You are a senior TikTok creative director for short-form product marketing, writing for the ${input.language === 'he' ? 'Israeli' : 'global English-speaking'} market.

Generate a complete script package for a single 8-second TikTok video.

Product: ${input.product}
Angle: ${input.angle}
Visual style: ${input.style}
Output language for hooks/VO/captions: ${input.language === 'he' ? 'Hebrew (native, not translated)' : 'English'}${refNote}${hebrewVoiceRules}

Requirements:
- 3 distinct hook variants (each <= 6 words, scroll-stopping, each takes a different angle)
- VO script: 2 short sentences max, total ~6-8 seconds of natural spoken delivery. Each sentence must sound natural read aloud.
- 5 caption beats covering 0-8 seconds. Each beat: startSec, endSec, short self-contained text. Beat 1 (0-2s) is the hook on screen.
- One Luma Dream Machine prompt (ALWAYS in English) for the b-roll: specific about camera (lens, movement), lighting (direction, quality), subject texture, background. No text, hands, or packaging in the visual.
- 5-8 single-word hashtags (no #, no spaces inside a hashtag)

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
