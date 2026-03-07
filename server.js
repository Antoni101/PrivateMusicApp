import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.static('public'));

// list songs in Music folder
app.get('/songs', (req, res) => {
    const files = fs.readdirSync('./Music').filter(f => f.endsWith('.mp4'));
    res.json(files);
});

// proxy for saavn search
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


app.get('/download', async (req, res) => {
    const { url, filename } = req.query;
    const filepath = `./Music/${filename}.mp4`;
    
    if (fs.existsSync(filepath)) {
        return res.json({ success: true, cached: true });
    }
    
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(buffer));
    res.json({ success: true, cached: false });
});

app.get('/Music/:filename', (req, res) => {
    const filepath = `./Music/${req.params.filename}`;
    if (fs.existsSync(filepath)) {
        res.sendFile(path.resolve(filepath));
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});


app.listen(3000, () => console.log('Running on http://localhost:3000'));