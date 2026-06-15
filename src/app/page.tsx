'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  Angle,
  Style,
  Language,
  GeneratedScript,
} from '@/lib/types';

const ANGLES: { value: Angle; label: string }[] = [
  { value: 'hook-based', label: 'Hook-based' },
  { value: 'educational', label: 'Educational' },
  { value: 'asmr', label: 'ASMR / satisfying' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'problem-solution', label: 'Problem / solution' },
];

const STYLES: { value: Style; label: string }[] = [
  { value: 'macro', label: 'Macro / close-up' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'minimalist', label: 'Minimalist' },
];

interface MediaItem {
  id: string;
  filename: string;
  public_url: string;
  media_type: 'image' | 'video';
  tag: string | null;
}

interface ClipState {
  id: string;
  state: 'queued' | 'dreaming' | 'completed' | 'failed';
  videoUrl?: string;
  failureReason?: string;
}

export default function Home() {
  const [product, setProduct] = useState('Freeze-dried strawberries');
  const [angle, setAngle] = useState<Angle>('hook-based');
  const [style, setStyle] = useState<Style>('macro');
  const [language, setLanguage] = useState<Language>('he');
  const [referenceNote, setReferenceNote] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [refMediaId, setRefMediaId] = useState<string>('');

  const [loadingScript, setLoadingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [selectedHook, setSelectedHook] = useState<number>(0);

  const [clips, setClips] = useState<ClipState[]>([]);
  const [clipsError, setClipsError] = useState<string | null>(null);
  const [generatingClips, setGeneratingClips] = useState(false);
  const [selectedClipIdx, setSelectedClipIdx] = useState<number | null>(null);

  const [voUrl, setVoUrl] = useState<string | null>(null);
  const [voError, setVoError] = useState<string | null>(null);
  const [generatingVo, setGeneratingVo] = useState(false);

  useEffect(() => {
    fetch('/api/media/list')
      .then((r) => r.json())
      .then((d) => setMedia(d.media ?? []))
      .catch(() => {});
  }, []);

  async function generateScript() {
    setLoadingScript(true);
    setScriptError(null);
    setScript(null);
    setClips([]);
    setSelectedClipIdx(null);
    setVoUrl(null);
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product,
          angle,
          style,
          language,
          referenceNote: referenceNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setScript(data);
      setSelectedHook(0);
    } catch (e) {
      setScriptError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoadingScript(false);
    }
  }

  async function generateClips() {
    if (!script) return;
    setGeneratingClips(true);
    setClipsError(null);
    setClips([]);
    setSelectedClipIdx(null);
    try {
      const refMedia = media.find((m) => m.id === refMediaId);
      const imageUrl = refMedia?.media_type === 'image' ? refMedia.public_url : undefined;

      const res = await fetch('/api/luma/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: script.lumaPrompt,
          imageUrl,
          count: 2,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Luma start failed');

      const initial: ClipState[] = data.generations.map((g: { id: string; state: ClipState['state'] }) => ({
        id: g.id,
        state: g.state,
      }));
      setClips(initial);
    } catch (e) {
      setClipsError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setGeneratingClips(false);
    }
  }

  useEffect(() => {
    if (clips.length === 0) return;
    const pending = clips.some((c) => c.state !== 'completed' && c.state !== 'failed');
    if (!pending) return;

    const timer = setInterval(async () => {
      const updates = await Promise.all(
        clips.map(async (c) => {
          if (c.state === 'completed' || c.state === 'failed') return c;
          try {
            const res = await fetch(`/api/luma/status/${c.id}`);
            const data = await res.json();
            return {
              id: c.id,
              state: data.state ?? c.state,
              videoUrl: data.videoUrl,
              failureReason: data.failureReason,
            } as ClipState;
          } catch {
            return c;
          }
        }),
      );
      setClips(updates);
    }, 4000);

    return () => clearInterval(timer);
  }, [clips]);

  async function generateVo() {
    if (!script) return;
    setGeneratingVo(true);
    setVoError(null);
    setVoUrl(null);
    try {
      const text = `${script.hooks[selectedHook]}. ${script.voScript}`;
      const res = await fetch('/api/elevenlabs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'VO generation failed');
      }
      const blob = await res.blob();
      setVoUrl(URL.createObjectURL(blob));
    } catch (e) {
      setVoError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setGeneratingVo(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Video Factory</h1>
            <p className="text-zinc-500 mt-1">
              Script → clips → voiceover. Final stitch comes in Session 3.
            </p>
          </div>
          <Link href="/media" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Media library →
          </Link>
        </header>

        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
          <SectionTitle>1. Inputs</SectionTitle>
          <div className="grid gap-5">
            <Field label="Product">
              <input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="input"
                placeholder="e.g. Freeze-dried mango chunks"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Field label="Angle">
                <select value={angle} onChange={(e) => setAngle(e.target.value as Angle)} className="input">
                  {ANGLES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Style">
                <select value={style} onChange={(e) => setStyle(e.target.value as Style)} className="input">
                  {STYLES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Language">
                <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="input">
                  <option value="he">Hebrew</option>
                  <option value="en">English</option>
                </select>
              </Field>
            </div>

            <Field label="Reference note (optional)">
              <input
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                className="input"
                placeholder="e.g. red matte product on black velvet background"
              />
            </Field>

            <Field label="Reference image from library (optional)">
              <select value={refMediaId} onChange={(e) => setRefMediaId(e.target.value)} className="input">
                <option value="">— none (text-to-video) —</option>
                {media.filter((m) => m.media_type === 'image').map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.filename}{m.tag ? ` (${m.tag})` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <button
              onClick={generateScript}
              disabled={loadingScript || !product.trim()}
              className="mt-2 self-start rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 font-medium disabled:opacity-50 hover:opacity-90"
            >
              {loadingScript ? 'Generating script…' : 'Generate script'}
            </button>
            {scriptError && <ErrorBox>{scriptError}</ErrorBox>}
          </div>
        </section>

        {script && (
          <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8 space-y-6">
            <SectionTitle>2. Script — pick your hook</SectionTitle>
            <Block title="Hooks">
              <ul className="space-y-2">
                {script.hooks.map((h, i) => (
                  <li key={i}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="hook"
                        checked={selectedHook === i}
                        onChange={() => setSelectedHook(i)}
                        className="mt-1"
                      />
                      <span dir={language === 'he' ? 'rtl' : 'ltr'} className="text-lg">{h}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </Block>

            <Block title="Voiceover script">
              <p dir={language === 'he' ? 'rtl' : 'ltr'} className="text-lg leading-relaxed">{script.voScript}</p>
            </Block>

            <Block title="Captions (8s timeline)">
              <div className="space-y-1.5">
                {script.captions.map((c, i) => (
                  <div key={i} className="flex gap-3 items-start text-sm">
                    <span className="text-zinc-500 font-mono shrink-0 w-20">
                      {c.startSec.toFixed(1)}–{c.endSec.toFixed(1)}s
                    </span>
                    <span dir={language === 'he' ? 'rtl' : 'ltr'}>{c.text}</span>
                  </div>
                ))}
              </div>
            </Block>

            <Block title="Luma prompt">
              <p className="text-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 leading-relaxed font-mono">
                {script.lumaPrompt}
              </p>
            </Block>

            <Block title="Hashtags">
              <div className="flex flex-wrap gap-2">
                {script.hashtags.map((h, i) => (
                  <span key={i} className="text-sm bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 py-1">
                    #{h}
                  </span>
                ))}
              </div>
            </Block>
          </section>
        )}

        {script && (
          <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
            <SectionTitle>3. Video clips (Luma)</SectionTitle>
            <p className="text-sm text-zinc-500 mb-4">
              Generates 2 variants. Takes ~60–120 seconds. Each clip costs ~$0.40.
            </p>
            <button
              onClick={generateClips}
              disabled={generatingClips || clips.some((c) => c.state !== 'completed' && c.state !== 'failed')}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 font-medium disabled:opacity-50 hover:opacity-90"
            >
              {generatingClips ? 'Starting…' : 'Generate 2 clips'}
            </button>
            {clipsError && <ErrorBox>{clipsError}</ErrorBox>}

            {clips.length > 0 && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clips.map((c, i) => (
                  <ClipCard
                    key={c.id}
                    clip={c}
                    index={i}
                    selected={selectedClipIdx === i}
                    onSelect={() => setSelectedClipIdx(i)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {script && (
          <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
            <SectionTitle>4. Voiceover (ElevenLabs)</SectionTitle>
            <p className="text-sm text-zinc-500 mb-4">
              Uses selected hook + VO script. Multilingual v2 model.
            </p>
            <button
              onClick={generateVo}
              disabled={generatingVo}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 font-medium disabled:opacity-50 hover:opacity-90"
            >
              {generatingVo ? 'Generating…' : 'Generate voiceover'}
            </button>
            {voError && <ErrorBox>{voError}</ErrorBox>}
            {voUrl && (
              <div className="mt-4">
                <audio src={voUrl} controls className="w-full" />
                <a href={voUrl} download="voiceover.mp3" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mt-2 inline-block">
                  Download MP3
                </a>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ClipCard({
  clip,
  index,
  selected,
  onSelect,
}: {
  clip: ClipState;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const done = clip.state === 'completed' && clip.videoUrl;
  const failed = clip.state === 'failed';
  return (
    <div
      className={`rounded-lg border p-3 ${selected ? 'border-zinc-900 dark:border-zinc-100' : 'border-zinc-200 dark:border-zinc-800'}`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Clip {index + 1}</span>
        <span className="text-xs text-zinc-500">{clip.state}</span>
      </div>
      <div className="aspect-[9/16] bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center overflow-hidden">
        {done ? (
          <video src={clip.videoUrl} controls className="w-full h-full object-cover" />
        ) : failed ? (
          <span className="text-xs text-red-500 p-2 text-center">{clip.failureReason ?? 'Failed'}</span>
        ) : (
          <span className="text-xs text-zinc-500 animate-pulse">Dreaming…</span>
        )}
      </div>
      {done && (
        <button
          onClick={onSelect}
          className={`mt-3 w-full text-sm rounded-md py-1.5 ${selected ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800'}`}
        >
          {selected ? '✓ Selected' : 'Select this clip'}
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm uppercase tracking-wide text-zinc-500 mb-2 font-medium">{title}</h3>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold mb-4">{children}</h2>;
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900 text-red-700 dark:text-red-300 p-3 text-sm">
      {children}
    </div>
  );
}
