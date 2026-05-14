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
  const [enriching, setEnriching] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function enrichFromUrl(url: string) {
    if (!url) return;
    setEnriching(true);
    setPreviewImage(null);
    try {
      const res = await fetch(`/api/enrich?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.date) setDate(data.date);
      if (data.time) setTime(data.time);
      if (data.venue) setVenue(data.venue);
      if (data.city) setCity(data.city);
      if (data.tag) setTag(data.tag);
      if (data.imageUrl) setPreviewImage(data.imageUrl);
    } catch {
      // silent
    } finally {
      setEnriching(false);
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

  const inputClass = "w-full bg-[#141414] border border-[#222] rounded-2xl px-4 py-3.5 text-white placeholder-[#555] focus:outline-none focus:border-[#C8FF00] transition-colors text-[15px]";

  if (!authed) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-5">
        <div className="w-full max-w-[360px]">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#C8FF00] mb-5">
              <span className="text-2xl font-black text-black">W</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Woeva Picks</h1>
            <p className="text-[#555] text-sm mt-1">Admin prístup</p>
          </div>

          <form onSubmit={checkPassword} className="space-y-3">
            <input
              type="password"
              placeholder="Heslo"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              className={inputClass}
              autoFocus
            />
            {error && <p className="text-red-400 text-sm px-1">{error}</p>}
            <button type="submit" className="w-full bg-[#C8FF00] text-black font-bold py-3.5 rounded-2xl hover:bg-[#b4e800] active:scale-[0.98] transition-all text-[15px]">
              Vstúpiť
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-start justify-center p-5 pt-10 pb-16">
      <div className="w-full max-w-[420px]">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#C8FF00] flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-black text-black">W</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Woeva Picks</h1>
            <p className="text-[#555] text-xs">Pridaj event z Instagramu</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">

          {/* URL input */}
          <input
            type="url"
            placeholder="Instagram / Facebook link *"
            value={igUrl}
            onChange={e => { setIgUrl(e.target.value); setPreviewImage(null); }}
            onBlur={e => enrichFromUrl(e.target.value)}
            required
            className={inputClass}
          />

          {/* Loading state */}
          {enriching && (
            <div className="flex items-center gap-2.5 px-1 py-1">
              <div className="w-4 h-4 border-2 border-[#C8FF00] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-[#555] text-sm">Analyzujem link...</span>
            </div>
          )}

          {/* Image preview */}
          {previewImage && !enriching && (
            <div className="rounded-2xl overflow-hidden bg-[#141414] aspect-video">
              <img src={previewImage} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Title */}
          <input
            type="text"
            placeholder="Názov eventu *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className={inputClass}
          />

          {/* Date + Time */}
          <div className="flex gap-2.5">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={`flex-1 ${inputClass}`}
            />
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-[110px] bg-[#141414] border border-[#222] rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-[#C8FF00] transition-colors text-[15px]"
            />
          </div>

          {/* Venue */}
          <input
            type="text"
            placeholder="Miesto / venue"
            value={venue}
            onChange={e => setVenue(e.target.value)}
            className={inputClass}
          />

          {/* City + Tag */}
          <div className="flex gap-2.5">
            <select value={city} onChange={e => setCity(e.target.value)}
              className="flex-1 bg-[#141414] border border-[#222] rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-[#C8FF00] transition-colors text-[15px] appearance-none">
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={tag} onChange={e => setTag(e.target.value)}
              className="flex-1 bg-[#141414] border border-[#222] rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-[#C8FF00] transition-colors text-[15px] appearance-none">
              {TAGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Feedback */}
          {error && <p className="text-red-400 text-sm px-1">{error}</p>}
          {sent && (
            <div className="bg-[#C8FF00]/10 border border-[#C8FF00]/20 rounded-2xl px-4 py-3 text-[#C8FF00] text-sm text-center">
              ✓ Poslané — Bruno ho zoberie do 5 minút
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || enriching}
            className="w-full bg-[#C8FF00] text-black font-bold py-4 rounded-2xl hover:bg-[#b4e800] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-[15px] mt-1"
          >
            {loading ? 'Posielam...' : 'Poslať do Discordu →'}
          </button>
        </form>
      </div>
    </main>
  );
}
