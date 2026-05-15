'use client';

import { useRef, useState } from 'react';

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

  const [screenshotImage, setScreenshotImage] = useState<File | null>(null);
  const [screenshotPopis, setScreenshotPopis] = useState<File | null>(null);
  const [screenshotImagePreview, setScreenshotImagePreview] = useState<string | null>(null);
  const [screenshotPopisPreview, setScreenshotPopisPreview] = useState<string | null>(null);

  const [coverSameAsScreenshot, setCoverSameAsScreenshot] = useState(true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [igUrl, setIgUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Bratislava');
  const [tags, setTags] = useState<string[]>(['zaujimave']);

  const [enriching, setEnriching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const screenshotImageRef = useRef<HTMLInputElement>(null);
  const screenshotPopisRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const enrichIdRef = useRef(0);

  async function runEnrichment(imageFile: File | null, popisFile: File | null) {
    const files = [imageFile, popisFile].filter(Boolean) as File[];
    if (!files.length) return;

    enrichIdRef.current += 1;
    const myId = enrichIdRef.current;

    // Clear fields and show loader — user sees only spinner until final result
    setTitle('');
    setDescription('');
    setDate('');
    setTime('');
    setVenue('');
    setCity('Bratislava');
    setTags(['zaujimave']);
    setEnriching(true);

    try {
      const fd = new FormData();
      files.forEach(f => fd.append('images', f));
      const res = await fetch('/api/enrich-image', { method: 'POST', body: fd });
      const data = await res.json();

      // Discard stale response if a newer enrichment was triggered
      if (myId !== enrichIdRef.current) return;

      if (!res.ok) {
        setError(`Analýza zlyhala: ${data.error || res.status}`);
        return;
      }

      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.date) setDate(data.date);
      if (data.time) setTime(data.time);
      if (data.venue) setVenue(data.venue);
      if (data.city) setCity(data.city);
      if (data.tag) setTags([data.tag]);
    } catch {
      if (myId === enrichIdRef.current) setError('Analýza screenshotov zlyhala — skontroluj OPENAI_API_KEY v Vercel');
    } finally {
      if (myId === enrichIdRef.current) setEnriching(false);
    }
  }

  function handleScreenshotImage(file: File) {
    setScreenshotImage(file);
    const url = URL.createObjectURL(file);
    setScreenshotImagePreview(url);
    runEnrichment(file, screenshotPopis);
  }

  function handleScreenshotPopis(file: File) {
    setScreenshotPopis(file);
    setScreenshotPopisPreview(URL.createObjectURL(file));
    runEnrichment(screenshotImage, file);
  }

  function handleCoverFile(file: File) {
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function checkPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password) {
      setAuthed(true);
      setError('');
    } else {
      setError('Zadaj heslo');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) { setError('Zadaj názov eventu'); return; }
    setLoading(true);
    setError('');
    setSent(false);

    try {
      let imageUrl: string | null = null;

      const fileToUpload = coverSameAsScreenshot ? screenshotImage : coverFile;
      if (fileToUpload) {
        const fd = new FormData();
        fd.append('file', fileToUpload);
        const upRes = await fetch('/api/upload-image', { method: 'POST', body: fd });
        const upData = await upRes.json();
        if (upData.url) {
          imageUrl = upData.url;
        } else {
          setError(`Upload fotky zlyhal: ${upData.error || 'neznáma chyba'}`);
          return;
        }
      }

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, igUrl, title, description, date, time, venue, city, tag: tags.join(','), imageUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Niečo sa pokazilo');
        return;
      }
    } catch (err) {
      setError(`Chyba: ${err}`);
      return;
    } finally {
      setLoading(false);
    }

    setSent(true);
      setScreenshotImage(null);
      setScreenshotPopis(null);
      setScreenshotImagePreview(null);
      setScreenshotPopisPreview(null);
      setCoverFile(null);
      setCoverPreview(null);
      setCoverSameAsScreenshot(true);
      setIgUrl('');
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
      setVenue('');
      setCity('Bratislava');
      setTags(['zaujimave']);
      if (screenshotImageRef.current) screenshotImageRef.current.value = '';
      if (screenshotPopisRef.current) screenshotPopisRef.current.value = '';
      if (coverRef.current) coverRef.current.value = '';
  }

  const inputClass = "w-full bg-[#141414] border border-[#222] rounded-2xl px-4 py-3.5 text-white placeholder-[#555] focus:outline-none focus:border-[#C8FF00] transition-colors text-[15px]";

  const coverDisplayPreview = coverSameAsScreenshot ? screenshotImagePreview : coverPreview;

  if (!authed) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-5">
        <div className="w-full max-w-[360px]">
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
            <p className="text-[#555] text-xs">Pridaj event</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Screenshots */}
          <p className="text-[#555] text-xs uppercase tracking-widest px-1">Screenshoty</p>
          <div className="flex gap-2.5">
            {/* Screenshot obrazku */}
            <label className="flex-1 cursor-pointer">
              <input ref={screenshotImageRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleScreenshotImage(f); }} />
              <div className="relative bg-[#141414] border border-[#222] rounded-2xl overflow-hidden aspect-square flex flex-col items-center justify-center gap-2 hover:border-[#C8FF00]/40 transition-colors">
                {screenshotImagePreview ? (
                  <img src={screenshotImagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <span className="text-2xl">🖼️</span>
                    <span className="text-[#555] text-xs text-center px-2">Screenshot<br />obrazku</span>
                  </>
                )}
              </div>
            </label>

            {/* Screenshot popisu */}
            <label className="flex-1 cursor-pointer">
              <input ref={screenshotPopisRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleScreenshotPopis(f); }} />
              <div className="relative bg-[#141414] border border-[#222] rounded-2xl overflow-hidden aspect-square flex flex-col items-center justify-center gap-2 hover:border-[#C8FF00]/40 transition-colors">
                {screenshotPopisPreview ? (
                  <img src={screenshotPopisPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <span className="text-2xl">📝</span>
                    <span className="text-[#555] text-xs text-center px-2">Screenshot<br />popisu</span>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Enriching spinner */}
          {enriching && (
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-4 h-4 border-2 border-[#C8FF00] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-[#555] text-sm">Analyzujem screenshoty...</span>
            </div>
          )}

          {/* Event fields */}
          <p className="text-[#555] text-xs uppercase tracking-widest px-1 pt-1">Detaily eventu</p>

          <input type="text" placeholder="Názov eventu *" value={title}
            onChange={e => setTitle(e.target.value)} required className={inputClass} />

          <textarea placeholder="Popis eventu" value={description}
            onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full bg-[#141414] border border-[#222] rounded-2xl px-4 py-3.5 text-white placeholder-[#555] focus:outline-none focus:border-[#C8FF00] transition-colors text-[15px] resize-none" />

          <div className="flex gap-2.5">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className={`flex-1 ${inputClass}`} />
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-[110px] bg-[#141414] border border-[#222] rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-[#C8FF00] transition-colors text-[15px]" />
          </div>

          <input type="text" placeholder="Miesto / venue" value={venue}
            onChange={e => setVenue(e.target.value)} className={inputClass} />

          <select value={city} onChange={e => setCity(e.target.value)}
            className="w-full bg-[#141414] border border-[#222] rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-[#C8FF00] transition-colors text-[15px] appearance-none">
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Tags — max 3, chip multiselect */}
          <div className="flex flex-wrap gap-2">
            {TAGS.map(t => {
              const selected = tags.includes(t.value);
              const disabled = !selected && tags.length >= 3;
              return (
                <button
                  key={t.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (selected) {
                      setTags(tags.filter(x => x !== t.value));
                    } else if (tags.length < 3) {
                      setTags([...tags, t.value]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                    selected
                      ? 'bg-[#C8FF00] text-black border-[#C8FF00]'
                      : disabled
                      ? 'bg-transparent text-[#333] border-[#222] cursor-not-allowed'
                      : 'bg-transparent text-[#666] border-[#2a2a2a] hover:border-[#555] hover:text-[#aaa]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <p className="text-[#444] text-xs px-1">Max 3 tagy — GPT vyberie prvý automaticky</p>

          <input type="url" placeholder="Instagram / Facebook link (voliteľné)" value={igUrl}
            onChange={e => setIgUrl(e.target.value)}
            className={inputClass} />

          {/* Cover photo */}
          <p className="text-[#555] text-xs uppercase tracking-widest px-1 pt-1">Titulná fotka</p>

          <label className="flex items-center gap-3 px-1 cursor-pointer select-none">
            <div onClick={() => setCoverSameAsScreenshot(v => !v)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${coverSameAsScreenshot ? 'bg-[#C8FF00] border-[#C8FF00]' : 'border-[#444]'}`}>
              {coverSameAsScreenshot && <span className="text-black text-xs font-bold">✓</span>}
            </div>
            <span className="text-[#888] text-sm">Rovnaká ako screenshot obrazku</span>
          </label>

          {!coverSameAsScreenshot && (
            <label className="cursor-pointer block">
              <input ref={coverRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); }} />
              <div className="bg-[#141414] border border-dashed border-[#333] rounded-2xl py-4 px-4 flex items-center gap-3 hover:border-[#C8FF00]/40 transition-colors">
                {coverPreview ? (
                  <img src={coverPreview} alt="" className="w-12 h-12 object-cover rounded-xl flex-shrink-0" />
                ) : (
                  <span className="text-2xl">🖼️</span>
                )}
                <span className="text-[#555] text-sm">
                  {coverPreview ? 'Titulná fotka nahraná — zmeň ak treba' : 'Nahraj titulnú fotku'}
                </span>
              </div>
            </label>
          )}

          {coverDisplayPreview && (
            <div className="rounded-2xl overflow-hidden bg-[#141414] aspect-video">
              <img src={coverDisplayPreview} alt="cover" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Feedback */}
          {error && <p className="text-red-400 text-sm px-1">{error}</p>}
          {sent && (
            <div className="bg-[#C8FF00]/10 border border-[#C8FF00]/20 rounded-2xl px-4 py-3 text-[#C8FF00] text-sm text-center">
              ✓ Poslané — Bruno ho zoberie do 5 minút
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading || enriching}
            className="w-full bg-[#C8FF00] text-black font-bold py-4 rounded-2xl hover:bg-[#b4e800] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-[15px] mt-1">
            {loading ? 'Posielam...' : 'Poslať do Discordu →'}
          </button>
        </form>
      </div>
    </main>
  );
}
