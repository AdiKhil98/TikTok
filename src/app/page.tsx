'use client';

import { useState } from 'react';
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

export default function Home() {
  const [product, setProduct] = useState('Freeze-dried strawberries');
  const [angle, setAngle] = useState<Angle>('hook-based');
  const [style, setStyle] = useState<Style>('macro');
  const [language, setLanguage] = useState<Language>('he');
  const [referenceNote, setReferenceNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedScript | null>(null);
  const [selectedHook, setSelectedHook] = useState<number>(0);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
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
      setResult(data);
      setSelectedHook(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">Video Factory</h1>
          <p className="text-zinc-500 mt-1">
            Step 1 — generate hooks, script, captions, and a Luma prompt.
          </p>
        </header>

        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
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
                <select
                  value={angle}
                  onChange={(e) => setAngle(e.target.value as Angle)}
                  className="input"
                >
                  {ANGLES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Style">
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as Style)}
                  className="input"
                >
                  {STYLES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Language">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="input"
                >
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

            <button
              onClick={generate}
              disabled={loading || !product.trim()}
              className="mt-2 self-start rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 font-medium disabled:opacity-50 hover:opacity-90"
            >
              {loading ? 'Generating…' : 'Generate script'}
            </button>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900 text-red-700 dark:text-red-300 p-4 text-sm">
            {error}
          </div>
        )}

        {result && (
          <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
            <Block title="Hooks (pick one)">
              <ul className="space-y-2">
                {result.hooks.map((h, i) => (
                  <li key={i}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="hook"
                        checked={selectedHook === i}
                        onChange={() => setSelectedHook(i)}
                        className="mt-1"
                      />
                      <span
                        dir={language === 'he' ? 'rtl' : 'ltr'}
                        className="text-lg"
                      >
                        {h}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </Block>

            <Block title="Voiceover script">
              <p
                dir={language === 'he' ? 'rtl' : 'ltr'}
                className="text-lg leading-relaxed"
              >
                {result.voScript}
              </p>
            </Block>

            <Block title="Captions (8s timeline)">
              <div className="space-y-1.5">
                {result.captions.map((c, i) => (
                  <div key={i} className="flex gap-3 items-start text-sm">
                    <span className="text-zinc-500 font-mono shrink-0 w-20">
                      {c.startSec.toFixed(1)}–{c.endSec.toFixed(1)}s
                    </span>
                    <span dir={language === 'he' ? 'rtl' : 'ltr'}>{c.text}</span>
                  </div>
                ))}
              </div>
            </Block>

            <Block title="Luma prompt (English, for video generation)">
              <p className="text-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 leading-relaxed font-mono">
                {result.lumaPrompt}
              </p>
            </Block>

            <Block title="Hashtags">
              <div className="flex flex-wrap gap-2">
                {result.hashtags.map((h, i) => (
                  <span
                    key={i}
                    className="text-sm bg-zinc-100 dark:bg-zinc-800 rounded-full px-3 py-1"
                  >
                    #{h}
                  </span>
                ))}
              </div>
            </Block>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
              Session 2 will wire this into Luma + ElevenLabs. For now, copy what you need.
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm uppercase tracking-wide text-zinc-500 mb-2 font-medium">
        {title}
      </h3>
      {children}
    </div>
  );
}
