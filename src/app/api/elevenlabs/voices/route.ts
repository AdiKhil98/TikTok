import { NextResponse } from 'next/server';
import { listVoices } from '@/lib/elevenlabs';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const voices = await listVoices();
    return NextResponse.json({
      voices: voices.map((v) => ({
        id: v.voice_id,
        name: v.name,
        labels: v.labels ?? {},
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
