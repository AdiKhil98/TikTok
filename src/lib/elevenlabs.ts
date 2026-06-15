const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

export const DEFAULT_HEBREW_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

export interface ElevenVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
}

function authHeaders(extra: Record<string, string> = {}) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY not set');
  return { 'xi-api-key': key, ...extra };
}

export async function synthesizeSpeech(opts: {
  text: string;
  voiceId?: string;
  modelId?: string;
}): Promise<ArrayBuffer> {
  const voiceId = opts.voiceId ?? DEFAULT_HEBREW_VOICE_ID;
  const modelId = opts.modelId ?? 'eleven_multilingual_v2';

  const res = await fetch(
    `${ELEVEN_BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'audio/mpeg' }),
      body: JSON.stringify({
        text: opts.text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2 },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs failed (${res.status}): ${errText}`);
  }
  return await res.arrayBuffer();
}

export async function listVoices(): Promise<ElevenVoice[]> {
  const res = await fetch(`${ELEVEN_BASE}/voices`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`ElevenLabs list voices failed: ${res.status}`);
  }
  const data = (await res.json()) as { voices: ElevenVoice[] };
  return data.voices;
}
