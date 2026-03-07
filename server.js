import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const MUSIC_DIR = './Music';

const app = express();
app.use(express.static('public'));
app.use(express.json());

// list songs in Music folder
app.get('/songs', (req, res) => {
    const folders = fs.readdirSync(MUSIC_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
    res.json(folders);
});

// proxy for saavn search, W API
app.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        const response = await fetch(`https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${q}&limit=10`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// to delete
app.delete('/song/:songname', (req, res) => {
    const songDir = path.join(MUSIC_DIR, req.params.songname);
    if (!fs.existsSync(songDir)) {
        return res.status(404).json({ error: 'Song not found' });
    }
    fs.rmSync(songDir, { recursive: true });
    res.json({ success: true });
});


// When the user downloads a song
app.get('/download', async (req, res) => {

    const { url, filename, metadata } = req.query;
    const songDir = path.join(MUSIC_DIR, filename);
    const filepath = path.join(songDir, `${filename}.mp4`);
    const infoPath = path.join(songDir, 'info.json');
    
    if (fs.existsSync(filepath)) {
        return res.json({ success: true, cached: true });
    }

    // create folder for song
    fs.mkdirSync(songDir, { recursive: true });
    
    // download the mp4
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));

    // save metadata if provided
    if (metadata) {
        fs.writeFileSync(infoPath, JSON.stringify(JSON.parse(metadata), null, 2));
    }

    res.json({ success: true, cached: false });
});


// serve the mp4
app.get('/Music/:songname/:filename', (req, res) => {
    const filepath = path.join(MUSIC_DIR, req.params.songname, req.params.filename);
    if (fs.existsSync(filepath)) {
        res.sendFile(path.resolve(filepath));
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// serve cached metadata
app.get('/info/:songname', (req, res) => {
    const infoPath = path.join(MUSIC_DIR, req.params.songname, 'info.json');
    if (fs.existsSync(infoPath)) {
        return res.json(JSON.parse(fs.readFileSync(infoPath, 'utf-8')));
    }
    res.status(404).json({ error: 'No cached info' });
});



// LYRICS STUFF

// ---- LYRICS ----
app.get('/lyrics', async (req, res) => {
    const { title, artist } = req.query;
    try {
        const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(`${title} ${artist}`)}`);
        const data = await response.json();
        const result = data.length ? data[0] : {};
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//itunes previews
app.get('/preview', async (req, res) => {
    const { title, artist } = req.query;
    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`)}&media=music&limit=1`);
        const data = await response.json();
        const previewUrl = data.results[0]?.previewUrl || null;
        res.json({ previewUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// get cached lyrics
app.get('/song/:songname/lyrics', (req, res) => {
    const songname = decodeURIComponent(req.params.songname);
    const lyricsPath = path.join(MUSIC_DIR, songname, 'lyrics.json');
    if (fs.existsSync(lyricsPath)) {
        return res.json(JSON.parse(fs.readFileSync(lyricsPath, 'utf-8')));
    }
    res.status(404).json({ error: 'No lyrics' });
});

// save lyrics
app.post('/song/:songname/lyrics', (req, res) => {
    const lyricsPath = path.join(MUSIC_DIR, req.params.songname, 'lyrics.json');
    fs.writeFileSync(lyricsPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
});

// delete lyrics
app.delete('/song/:songname/lyrics', (req, res) => {
    const lyricsPath = path.join(MUSIC_DIR, req.params.songname, 'lyrics.json');
    if (fs.existsSync(lyricsPath)) fs.unlinkSync(lyricsPath);
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000, () => console.log('Running on http://localhost:3000'));