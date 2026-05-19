'use client';

import { useRef, useState } from 'react';

async function compressImage(file: File, maxPx = 1200, quality = 0.82): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }) : file);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

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

type Slot = {
  date: string;
  time: string;
  coverSameAsMain: boolean;
  coverFile: File | null;
  coverPreview: string | null;
};

const EMPTY_SLOT: Slot = { date: '', time: '', coverSameAsMain: true, coverFile: null, coverPreview: null };

export default function Home() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

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
  const [venueLat, setVenueLat] = useState<number | null>(null);
  const [venueLng, setVenueLng] = useState<number | null>(null);
  const [venueResults, setVenueResults] = useState<{name: string; city: string; lat: number; lng: number}[]>([]);
  const [venueConfirmed, setVenueConfirmed] = useState(false);
  const [venueLoading, setVenueLoading] = useState(false);
  const venueDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [city, setCity] = useState('Bratislava');
  const [tags, setTags] = useState<string[]>(['zaujimave']);

  // Bulk mode — up to 3 slots
  const [slots, setSlots] = useState<Slot[]>([{ ...EMPTY_SLOT }]);
  const slotCoverRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [enriching, setEnriching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [error, setError] = useState('');

  const screenshotImageRef = useRef<HTMLInputElement>(null);
  const screenshotPopisRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const enrichIdRef = useRef(0);

  function updateSlot(i: number, patch: Partial<Slot>) {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  }

  function addSlot() {
    if (slots.length >= 3) return;
    setSlots(prev => [...prev, { ...EMPTY_SLOT }]);
  }

  function removeSlot(i: number) {
    setSlots(prev => prev.filter((_, idx) => idx !== i));
  }

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
      const compressed = await Promise.all(files.map(f => compressImage(f)));
      const fd = new FormData();
      compressed.forEach(f => fd.append('images', f));
      const res = await fetch('/api/enrich-image', { method: 'POST', body: fd });

      // Discard stale response if a newer enrichment was triggered
      if (myId !== enrichIdRef.current) return;

      let data: Record<string, string> = {};
      const rawText = await res.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        setError(`Analýza zlyhala: ${res.status} — ${rawText.slice(0, 120)}`);
        return;
      }

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
    } catch (err: unknown) {
      if (myId === enrichIdRef.current) setError('Analýza zlyhala: ' + (err instanceof Error ? err.message : String(err)));
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

  async function handleVenueSearch(q: string) {
    setVenue(q);
    setVenueConfirmed(false);
    setVenueLat(null);
    setVenueLng(null);
    setVenueResults([]);
    if (q.length < 3) return;
    if (venueDebounce.current) clearTimeout(venueDebounce.current);
    venueDebounce.current = setTimeout(async () => {
      setVenueLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5`, { headers: { 'Accept-Language': 'sk,en' } });
        const data = await res.json();
        setVenueResults(data.map((r: any) => ({
          name: r.display_name.split(', ').slice(0, 3).join(', '),
          city: r.address?.city ?? r.address?.town ?? r.address?.village ?? '',
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })));
      } catch {}
      finally { setVenueLoading(false); }
    }, 400);
  }

  function selectVenue(r: {name: string; city: string; lat: number; lng: number}) {
    setVenue(r.name);
    setVenueLat(r.lat);
    setVenueLng(r.lng);
    if (r.city) setCity(r.city);
    setVenueConfirmed(true);
    setVenueResults([]);
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

  function resetForm() {
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
    setVenueLat(null);
    setVenueLng(null);
    setVenueConfirmed(false);
    setVenueResults([]);
    setCity('Bratislava');
    setTags(['zaujimave']);
    setSlots([{ ...EMPTY_SLOT }]);
    if (screenshotImageRef.current) screenshotImageRef.current.value = '';
    if (screenshotPopisRef.current) screenshotPopisRef.current.value = '';
    if (coverRef.current) coverRef.current.value = '';
    slotCoverRefs.current.forEach(r => { if (r) r.value = ''; });
  }

  async function uploadFile(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
    const data = await res.json();
    return data.url ?? null;
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
        imageUrl = await uploadFile(fileToUpload);
        if (!imageUrl) { setError('Upload fotky zlyhal'); return; }
      }

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, igUrl, title, description, date, time, venue, venueLat, venueLng, city, tag: tags.join(','), imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Niečo sa pokazilo'); return; }
    } catch (err) {
      setError(`Chyba: ${err}`); return;
    } finally {
      setLoading(false);
    }

    setSent(true);
    resetForm();
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) { setError('Zadaj názov eventu'); return; }
    const filledSlots = slots.filter(s => s.date);
    if (filledSlots.length === 0) { setError('Zadaj aspoň jeden dátum'); return; }
    setLoading(true);
    setError('');
    setSent(false);
    setSentCount(0);

    try {
      // Upload main cover once
      let mainImageUrl: string | null = null;
      const mainFile = coverSameAsScreenshot ? screenshotImage : coverFile;
      if (mainFile) {
        mainImageUrl = await uploadFile(mainFile);
        if (!mainImageUrl) { setError('Upload hlavnej fotky zlyhal'); return; }
      }

      let count = 0;
      for (const slot of filledSlots) {
        let slotImageUrl = mainImageUrl;
        if (!slot.coverSameAsMain && slot.coverFile) {
          slotImageUrl = await uploadFile(slot.coverFile) ?? mainImageUrl;
        }
        const res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password, igUrl, title, description, date: slot.date, time: slot.time, venue, venueLat, venueLng, city, tag: tags.join(','), imageUrl: slotImageUrl }),
        });
        const data = await res.json();
        if (!res.ok) { setError(`Termín ${count + 1}: ${data.error || 'chyba'}`); return; }
        count++;
        setSentCount(count);
      }
    } catch (err) {
      setError(`Chyba: ${err}`); return;
    } finally {
      setLoading(false);
    }

    setSent(true);
    resetForm();
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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#C8FF00] flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-black text-black">W</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Woeva Picks</h1>
            <p className="text-[#555] text-xs">Pridaj event</p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1.5 mb-5 bg-[#141414] rounded-2xl p-1">
          {(['single', 'bulk'] as const).map(m => (
            <button key={m} type="button" onClick={() => { setMode(m); setSent(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === m ? 'bg-[#C8FF00] text-black' : 'text-[#555] hover:text-[#888]'}`}>
              {m === 'single' ? 'Jeden termín' : 'Viac termínov'}
            </button>
          ))}
        </div>

        <form onSubmit={mode === 'single' ? handleSubmit : handleBulkSubmit} className="space-y-3">

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

          {mode === 'single' ? (
            <div className="flex gap-2.5">
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className={`flex-1 ${inputClass}`} />
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-[110px] bg-[#141414] border border-[#222] rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-[#C8FF00] transition-colors text-[15px]" />
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[#555] text-xs uppercase tracking-widest px-1">Termíny (max 3)</p>
              {slots.map((slot, i) => (
                <div key={i} className="bg-[#141414] border border-[#222] rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#888] text-xs font-semibold uppercase tracking-wider">Termín {i + 1}</span>
                    {slots.length > 1 && (
                      <button type="button" onClick={() => removeSlot(i)}
                        className="text-[#444] hover:text-red-400 text-xs transition-colors">✕ Odstrániť</button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input type="date" value={slot.date} onChange={e => updateSlot(i, { date: e.target.value })}
                      className={`flex-1 ${inputClass}`} />
                    <input type="time" value={slot.time} onChange={e => updateSlot(i, { time: e.target.value })}
                      className="w-[110px] bg-[#0A0A0A] border border-[#222] rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-[#C8FF00] transition-colors text-[15px]" />
                  </div>
                  {/* Per-slot photo */}
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div onClick={() => updateSlot(i, { coverSameAsMain: !slot.coverSameAsMain, coverFile: null, coverPreview: null })}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${slot.coverSameAsMain ? 'bg-[#C8FF00] border-[#C8FF00]' : 'border-[#444]'}`}>
                      {slot.coverSameAsMain && <span className="text-black text-[9px] font-bold leading-none">✓</span>}
                    </div>
                    <span className="text-[#666] text-xs">Rovnaká fotka ako hlavná</span>
                  </label>
                  {!slot.coverSameAsMain && (
                    <label className="cursor-pointer block">
                      <input ref={el => { slotCoverRefs.current[i] = el; }} type="file" accept="image/*" className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) updateSlot(i, { coverFile: f, coverPreview: URL.createObjectURL(f) });
                        }} />
                      <div className="bg-[#0A0A0A] border border-dashed border-[#333] rounded-xl py-3 px-3 flex items-center gap-3 hover:border-[#C8FF00]/40 transition-colors">
                        {slot.coverPreview
                          ? <img src={slot.coverPreview} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                          : <span className="text-xl">🖼️</span>}
                        <span className="text-[#555] text-xs">
                          {slot.coverPreview ? 'Fotka nahraná — zmeň ak treba' : 'Nahraj vlastnú fotku pre tento termín'}
                        </span>
                      </div>
                    </label>
                  )}
                  {!slot.coverSameAsMain && slot.coverPreview && (
                    <div className="rounded-xl overflow-hidden bg-[#0A0A0A] aspect-video">
                      <img src={slot.coverPreview} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ))}
              {slots.length < 3 && (
                <button type="button" onClick={addSlot}
                  className="w-full border border-dashed border-[#333] rounded-2xl py-3 text-[#555] text-sm hover:border-[#C8FF00]/40 hover:text-[#888] transition-colors">
                  + Pridať ďalší termín
                </button>
              )}
            </div>
          )}

          <div className="relative">
            <div className="relative">
              <input type="text" placeholder="Miesto / venue — začni písať adresu..." value={venue}
                onChange={e => handleVenueSearch(e.target.value)}
                className={`${inputClass} ${venueConfirmed ? 'border-[#C8FF00]' : ''}`} />
              {venueLoading && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] text-xs">...</span>}
              {venueConfirmed && !venueLoading && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C8FF00] text-sm font-bold">✓</span>}
            </div>
            {venueConfirmed && <p className="text-[#C8FF00] text-xs px-1 mt-1">📍 Adresa potvrdená — zobrazí sa na mape</p>}
            {!venueConfirmed && venue.length > 0 && !venueLoading && venueResults.length === 0 && venue.length >= 3 && (
              <p className="text-[#555] text-xs px-1 mt-1">Žiadne výsledky</p>
            )}
            {venueResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-[#1a1a1a] border border-[#333] rounded-2xl overflow-hidden shadow-xl">
                {venueResults.map((r, i) => (
                  <button key={i} type="button" onMouseDown={e => { e.preventDefault(); selectVenue(r); }}
                    className="w-full text-left px-4 py-3 hover:bg-[#222] transition-colors border-b border-[#222] last:border-0">
                    <p className="text-white text-sm font-medium truncate">{r.name}</p>
                    {r.city && <p className="text-[#555] text-xs">{r.city}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

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
          <p className="text-[#555] text-xs uppercase tracking-widest px-1 pt-1">
            {mode === 'bulk' ? 'Hlavná fotka (zdieľaná)' : 'Titulná fotka'}
          </p>

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
              {mode === 'bulk'
                ? `✓ Poslané ${sentCount} ${sentCount === 1 ? 'termín' : sentCount < 5 ? 'termíny' : 'termínov'} — Bruno ich zoberie do 5 minút`
                : '✓ Poslané — Bruno ho zoberie do 5 minút'}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading || enriching}
            className="w-full bg-[#C8FF00] text-black font-bold py-4 rounded-2xl hover:bg-[#b4e800] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-[15px] mt-1">
            {loading
              ? (mode === 'bulk' && sentCount > 0 ? `Posielam ${sentCount + 1}/${slots.filter(s => s.date).length}...` : 'Posielam...')
              : (mode === 'bulk' ? `Poslať ${slots.filter(s => s.date).length || ''} ${slots.filter(s => s.date).length === 1 ? 'termín' : 'termíny'} →` : 'Poslať do Discordu →')}
          </button>
        </form>
      </div>
    </main>
  );
}
