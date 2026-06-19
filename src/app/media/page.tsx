'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface MediaItem {
  id: string;
  filename: string;
  public_url: string;
  media_type: 'image' | 'video';
  tag: string | null;
  notes: string | null;
  created_at: string;
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [tag, setTag] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadList() {
    try {
      const res = await fetch('/api/media/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setItems(data.media);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (tag) fd.append('tag', tag);
      if (notes) fd.append('notes', notes);
      const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setFile(null);
      setTag('');
      setNotes('');
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Reference Media</h1>
            <p className="text-zinc-500 mt-1">
              Upload product photos and b-roll. Use them as image references for Luma.
            </p>
          </div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            ← Back to generator
          </Link>
        </header>

        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
          <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-4 font-medium">Upload</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium block mb-1.5">File</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium block mb-1.5">Tag</span>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                list="media-tag-suggestions"
                placeholder="strawberry / mango / packaging"
                className="input"
              />
              <datalist id="media-tag-suggestions">
                {Array.from(new Set(items.map((i) => i.tag).filter(Boolean))).map((t) => (
                  <option key={t!} value={t!} />
                ))}
              </datalist>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium block mb-1.5">Notes (optional)</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="lighting / angle / what's in the shot"
                className="input"
              />
            </label>
          </div>
          <button
            onClick={upload}
            disabled={!file || uploading}
            className="mt-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 font-medium disabled:opacity-50 hover:opacity-90"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          {error && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900 text-red-700 dark:text-red-300 p-3 text-sm">
              {error}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-wide text-zinc-500 mb-4 font-medium">
            Library ({items.length})
          </h2>
          {items.length === 0 ? (
            <div className="text-zinc-500 text-sm">No uploads yet.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((m) => (
                <div
                  key={m.id}
                  className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                >
                  <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    {m.media_type === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.public_url} alt={m.filename} className="w-full h-full object-cover" />
                    ) : (
                      <video src={m.public_url} className="w-full h-full object-cover" muted />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-xs font-medium truncate">{m.filename}</div>
                    {m.tag && (
                      <div className="text-xs text-zinc-500 mt-0.5">#{m.tag}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
