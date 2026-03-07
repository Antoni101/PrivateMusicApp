function parseLyrics(syncedLyrics) {
    return syncedLyrics.split('\n').map(line => {
        const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
        if (!match) return null;
        const minutes = parseFloat(match[1]);
        const seconds = parseFloat(match[2]);
        const text = match[3].trim();
        return { time: minutes * 60 + seconds, text };
    }).filter(Boolean);
}

let lyrics = [];
let currentLine = '';

async function fetchLyrics(song) {
    try {
        if (song.lyrics) {
            lyrics = song.lyrics;
            return;
        }

        const cached = await fetch(`/song/${encodeURIComponent(song.folderName)}/lyrics`);
        if (cached.ok) {
            const data = await cached.json();
            song.lyrics = data.syncedLyrics ? parseLyrics(data.syncedLyrics) : [];
            lyrics = song.lyrics;
            return;
        }

        const res = await fetch(`/lyrics?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`);
        const data = await res.json();
        song.lyrics = data.syncedLyrics ? parseLyrics(data.syncedLyrics) : [];
        lyrics = song.lyrics;

        // always cache regardless of whether lyrics were found
        await fetch(`/song/${encodeURIComponent(song.folderName)}/lyrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data.syncedLyrics ? data : { syncedLyrics: null })
        });

    } catch (err) {
        console.error('Lyrics fetch failed:', err);
        lyrics = [];
    }
}

function updateLyrics() {
    const current = sound.seek() + 0.1; // look 300ms ahead
    const line = lyrics.findLast(l => l.time <= current);

    if (line && line.text !== currentLine) {
        currentLine = line.text;
        const el = document.getElementById('lyrics');

        el.style.opacity = 0;
        el.style.filter = 'blur(10px)';
        el.style.transform = 'scale(0.95)';

        setTimeout(() => {
            el.innerHTML = line.text;
            el.style.opacity = 1;
            el.style.filter = 'blur(0px)';
            el.style.transform = 'scale(1)';
        }, 200);
    }
}