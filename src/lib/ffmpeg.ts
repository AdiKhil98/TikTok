import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { CaptionBeat } from './types';

function ffmpegBin(): string {
  return process.env.FFMPEG_PATH || 'ffmpeg';
}

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds - h * 3600 - m * 60;
  const cs = Math.round((s - Math.floor(s)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(Math.floor(s)).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function buildAss(opts: {
  captions: CaptionBeat[];
  hook: string;
  language: 'he' | 'en';
}): string {
  const fontName = 'Arial';
  const fontSize = 72;
  const playW = 1080;
  const playH = 1920;

  const header = `[Script Info]
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: ${playW}
PlayResY: ${playH}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,${fontName},${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,6,2,5,60,60,400,1
Style: Hook,${fontName},96,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,8,3,5,60,60,400,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const hookLine = `Dialogue: 0,${fmtTime(0)},${fmtTime(2)},Hook,,0,0,0,,${escapeAss(opts.hook)}`;

  const captionLines = opts.captions
    .slice(1)
    .map((c) => `Dialogue: 0,${fmtTime(c.startSec)},${fmtTime(c.endSec)},Caption,,0,0,0,,${escapeAss(c.text)}`)
    .join('\n');

  return `${header}${hookLine}\n${captionLines}\n`;
}

function escapeAss(text: string): string {
  return text.replace(/\n/g, '\\N').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url.slice(0, 80)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
}

async function runFfmpeg(workDir: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBin(), args, { cwd: workDir });
    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited ${code}: ${stderr.slice(-1500)}`));
    });
  });
}

export async function compressVideo(
  input: Buffer,
  opts: { crf?: number } = {},
): Promise<Buffer> {
  const work = await mkdtemp(path.join(tmpdir(), 'vf-cmp-'));
  try {
    const inPath = path.join(work, 'in.mp4');
    const outPath = path.join(work, 'out.mp4');
    await writeFile(inPath, input);

    const args = [
      '-y',
      '-i', 'in.mp4',
      '-c:v', 'libx264',
      '-crf', String(opts.crf ?? 26),
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      'out.mp4',
    ];

    await runFfmpeg(work, args);
    return await readFile(outPath);
  } finally {
    rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

export interface BuildVideoOptions {
  clipUrl: string;
  voAudio: Buffer;
  captions: CaptionBeat[];
  hook: string;
  language: 'he' | 'en';
}

export async function buildFinalVideo(opts: BuildVideoOptions): Promise<Buffer> {
  const work = await mkdtemp(path.join(tmpdir(), 'vf-'));

  try {
    const clipPath = path.join(work, 'clip.mp4');
    const voPath = path.join(work, 'vo.mp3');
    const assPath = path.join(work, 'captions.ass');
    const outPath = path.join(work, 'out.mp4');

    await downloadToFile(opts.clipUrl, clipPath);
    await writeFile(voPath, opts.voAudio);
    await writeFile(assPath, buildAss(opts), 'utf8');

    const args = [
      '-y',
      '-stream_loop', '-1',
      '-i', 'clip.mp4',
      '-i', 'vo.mp3',
      '-filter_complex',
      "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,subtitles=captions.ass[v]",
      '-map', '[v]',
      '-map', '1:a',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      'out.mp4',
    ];

    await runFfmpeg(work, args);
    const result = await readFile(outPath);
    return result;
  } finally {
    rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
