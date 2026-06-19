import { NextRequest, NextResponse } from 'next/server';
import { buildFinalVideo } from '@/lib/ffmpeg';
import { synthesizeSpeech } from '@/lib/elevenlabs';
import type { CaptionBeat, Language } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface BuildPayload {
  clipUrl: string;
  hook: string;
  voScript: string;
  captions: CaptionBeat[];
  language: Language;
  voiceId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BuildPayload;

    if (!body.clipUrl) {
      return NextResponse.json({ error: 'clipUrl is required' }, { status: 400 });
    }
    if (!body.hook || !body.voScript || !body.captions?.length) {
      return NextResponse.json(
        { error: 'hook, voScript, and captions are required' },
        { status: 400 },
      );
    }

    const voText = `${body.hook}. ${body.voScript}`;
    const voAudioArrayBuffer = await synthesizeSpeech({
      text: voText,
      voiceId: body.voiceId,
    });
    const voAudio = Buffer.from(voAudioArrayBuffer);

    const mp4 = await buildFinalVideo({
      clipUrl: body.clipUrl,
      voAudio,
      captions: body.captions,
      hook: body.hook,
      language: body.language,
    });

    return new NextResponse(new Uint8Array(mp4), {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="tiktok.mp4"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
