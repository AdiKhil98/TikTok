import { NextRequest, NextResponse } from 'next/server';
import { startLumaGeneration } from '@/lib/luma';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageUrl, count = 2 } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }
    const n = Math.min(Math.max(Number(count) || 2, 1), 4);

    const generations = await Promise.all(
      Array.from({ length: n }).map(() =>
        startLumaGeneration({ prompt, imageUrl, aspectRatio: '9:16' }),
      ),
    );

    return NextResponse.json({
      generations: generations.map((g) => ({ id: g.id, state: g.state })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
