import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'media';

export async function POST(req: NextRequest) {
  try {
    const { videoUrl, label, tag } = await req.json();
    if (!videoUrl || typeof videoUrl !== 'string') {
      return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
    }

    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Luma video (${videoRes.status})` },
        { status: 500 },
      );
    }
    const buf = await videoRes.arrayBuffer();

    const admin = supabaseAdmin();
    const safeLabel = (label || 'clip').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
    const storagePath = `clips/${Date.now()}_${safeLabel}.mp4`;

    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buf, { contentType: 'video/mp4', upsert: false });

    if (uploadErr) {
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

    const { data: row, error: insertErr } = await admin
      .from('media_library')
      .insert({
        filename: `${safeLabel}.mp4`,
        storage_path: storagePath,
        public_url: publicUrlData.publicUrl,
        media_type: 'video',
        tag: tag || 'generated',
        notes: label || null,
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: `DB insert failed: ${insertErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ media: row });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
