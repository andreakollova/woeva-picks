'use client';

import { useState } from 'react';

const CITIES = ['Bratislava', 'Košice', 'Nitra', 'Vienna', 'Prague', 'London'];
const TAGS = [
  { value: 'zaujimave', label: '✨ Zaujímavé' },
  { value: 'party', label: '🎉 Party' },
  { value: 'sport', label: '🏃 Šport' },
  { value: 'zapasy', label: '🏆 Zápasy' },
  { value: 'umenie', label: '🎨 Umenie' },
  { value: 'coffee', label: '☕ Coffee' },
  { value: 'priroda', label: '🌿 Príroda' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'conference', label: '📋 Konferencia' },
  { value: 'historia', label: '🏛️ História' },
];

export default function Home() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [igUrl, setIgUrl] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Bratislava');
  const [tag, setTag] = useState('zaujimave');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function fetchPreview(url: string) {
    if (!url) return;
    try {
      const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setPreviewImage(data.imageUrl ?? null);
    } catch {
      setPreviewImage(null);
    }
  }

  function checkPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || password === 'admin') {
      setAuthed(true);
      setError('');
    } else {
      setError('Zlé heslo');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSent(false);

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, igUrl, title, date, time, venue, city, tag }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Niečo sa pokazilo');
    } else {
      setSent(true);
      setIgUrl('');
      setPreviewImage(null);
      setTitle('');
      setDate('');
      setTime('');
      setVenue('');
      setCity('Bratislava');
      setTag('zaujimave');
    }
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-4xl font-black text-[#CDFF00] tracking-tight mb-1">Woeva Picks</div>
            <div className="text-zinc-500 text-sm">Admin</div>
          </div>
          <form onSubmit={checkPassword} className="space-y-4">
            <input
              type="password"
              placeholder="Heslo"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#CDFF00] transition"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-[#CDFF00] text-black font-bold py-3 rounded-xl hover:bg-[#b8e600] transition"
            >
              Vstúpiť
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-[#CDFF00] tracking-tight mb-1">Woeva Picks</div>
          <div className="text-zinc-500 text-sm">Pridaj event z Instagramu</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="url"
            placeholder="Instagram link *"
            value={igUrl}
            onChange={e => { setIgUrl(e.target.value); setPreviewImage(null); }}
            onBlur={e => fetchPreview(e.target.value)}
            required
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#CDFF00] transition"
          />

          {previewImage && (
            <div className="relative rounded-xl overflow-hidden h-48 bg-zinc-900">
              <img src={previewImage} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}

          <input
            type="text"
            placeholder="Názov eventu *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#CDFF00] transition"
          />
          <div className="flex gap-3">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CDFF00] transition"
            />
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-28 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CDFF00] transition"
            />
          </div>
          <input
            type="text"
            placeholder="Miesto / venue"
            value={venue}
            onChange={e => setVenue(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#CDFF00] transition"
          />
          <div className="flex gap-3">
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CDFF00] transition"
            >
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={tag}
              onChange={e => setTag(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CDFF00] transition"
            >
              {TAGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {sent && (
            <div className="bg-[#CDFF00]/10 border border-[#CDFF00]/30 rounded-xl px-4 py-3 text-[#CDFF00] text-sm text-center">
              ✓ Poslané — Bruno ho zoberie do 5 minút
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#CDFF00] text-black font-bold py-3 rounded-xl hover:bg-[#b8e600] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Posielam...' : 'Poslať do Discordu →'}
          </button>
        </form>
      </div>
    </main>
  );
}
