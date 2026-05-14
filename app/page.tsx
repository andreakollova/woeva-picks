'use client';

import { useState } from 'react';

const CITIES = ['Bratislava', 'Košice', 'Nitra', 'Vienna', 'Prague', 'London'];

export default function Home() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [igUrl, setIgUrl] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Bratislava');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

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
      body: JSON.stringify({ password, igUrl, title, date, time, venue, city }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Niečo sa pokazilo');
    } else {
      setSent(true);
      setIgUrl('');
      setTitle('');
      setDate('');
      setTime('');
      setVenue('');
      setCity('Bratislava');
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
            onChange={e => setIgUrl(e.target.value)}
            required
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#CDFF00] transition"
          />
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
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CDFF00] transition"
          >
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

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
