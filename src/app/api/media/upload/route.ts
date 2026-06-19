import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { compressVideo } from '@/lib/ffmpeg';

export const runtime = 'nodejs';
export const maxDuration = 180;

const BUCKET = 'media';
const COMPRESS_THRESHOLD = 45 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const tag = (formData.get('tag') as string) || '';
    const notes = (formData.get('notes') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Only image or video files are allowed' },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    let storagePath = `${Date.now()}_${safeName}`;
    let uploadBody: ArrayBuffer | Buffer = await file.arrayBuffer();
    let contentType = file.type;
    let compressedFromBytes: number | undefined;

    if (isVideo && file.size > COMPRESS_THRESHOLD) {
      compressedFromBytes = file.size;
      const compressed = await compressVideo(Buffer.from(uploadBody));
      uploadBody = compressed;
      contentType = 'video/mp4';
      storagePath = storagePath.replace(/\.[^.]+$/, '') + '.mp4';
    }

    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, uploadBody, {
        contentType,
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    const { data: row, error: insertErr } = await admin
      .from('media_library')
      .insert({
        filename: file.name,
        storage_path: storagePath,
        public_url: publicUrl,
        media_type: isImage ? 'image' : 'video',
        tag: tag || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: `DB insert failed: ${insertErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      media: row,
      compressed: compressedFromBytes
        ? {
            originalBytes: compressedFromBytes,
            finalBytes: Buffer.isBuffer(uploadBody) ? uploadBody.length : uploadBody.byteLength,
          }
        : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
