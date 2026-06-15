const LUMA_BASE = 'https://api.lumalabs.ai/dream-machine/v1';

export interface LumaGeneration {
  id: string;
  state: 'queued' | 'dreaming' | 'completed' | 'failed';
  failure_reason?: string;
  assets?: { video?: string };
  created_at?: string;
}

function authHeaders() {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new Error('LUMA_API_KEY not set');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export async function startLumaGeneration(opts: {
  prompt: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  duration?: '5s' | '9s';
  model?: 'ray-2' | 'ray-flash-2' | 'ray-1-6';
  imageUrl?: string;
}): Promise<LumaGeneration> {
  const body: Record<string, unknown> = {
    prompt: opts.prompt,
    model: opts.model ?? 'ray-2',
    aspect_ratio: opts.aspectRatio ?? '9:16',
    duration: opts.duration ?? '5s',
    resolution: '720p',
  };

  if (opts.imageUrl) {
    body.keyframes = {
      frame0: { type: 'image', url: opts.imageUrl },
    };
  }

  const res = await fetch(`${LUMA_BASE}/generations`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Luma start failed (${res.status}): ${errText}`);
  }
  return (await res.json()) as LumaGeneration;
}

export async function getLumaGeneration(id: string): Promise<LumaGeneration> {
  const res = await fetch(`${LUMA_BASE}/generations/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Luma status failed (${res.status}): ${errText}`);
  }
  return (await res.json()) as LumaGeneration;
}
