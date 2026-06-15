import { NextRequest, NextResponse } from 'next/server';
import { getLumaGeneration, extractVideoUrl } from '@/lib/luma';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const gen = await getLumaGeneration(id);
    return NextResponse.json({
      id: gen.id,
      state: gen.state,
      videoUrl: extractVideoUrl(gen),
      failureReason: gen.failure_reason,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
