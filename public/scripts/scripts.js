let sound = null
let playerInterval = null
let playing = false;
let songList = [];
let results = [];

class Song {
    constructor(title, artist, album, cover, url, explicit = false) {
        this.title = title;
        this.artist = artist;
        this.album = album;
        this.cover = cover;
        this.src = null;
        this.url = url;
        this.lyrics = null;
        this.explicit = explicit;
    }

    get folderName() {
        return `${this.title}-${this.artist}`;
    }

    async download() {
        const metadata = JSON.stringify({
            title: this.title,
            artist: this.artist,
            album: this.album,
            cover: this.cover,
            explicit: this.explicit,
        });

        try {
            await fetch(`/download?url=${encodeURIComponent(this.url)}&filename=${encodeURIComponent(this.folderName)}&metadata=${encodeURIComponent(metadata)}`);
            this.src = `/Music/${this.folderName}/${this.folderName}.mp4`;

            // fetch and cache lyrics at download time
            await fetchLyrics(this);

            return this.src;
        } catch (err) {
            console.error('Download failed:', err);
            return null;
        }
    }

    async delete() {
        try {
            await fetch(`/song/${encodeURIComponent(this.folderName)}`, { method: 'DELETE' });
            this.src = null;
        } catch (err) {
            console.error('Delete failed:', err);
        }
    }

}

async function pageLoad() {
    createBars();
    await loadSonglist();
}

async function getSong(songName, songArtist) {

    const query = encodeURIComponent(`${songName} ${songArtist}`);
    const res = await fetch(`/search?q=${query}`).then(r => r.json());
    if (!res.data.results?.length) return null
    const songData = res.data.results[0];

    //const songInfo = data.data[0]
    //console.log(songInfo);
    const title = songData.name;
    const album = songData.album.name;
    const artist = songData.primaryArtists;
    const cover = songData.image[songData.image.length - 1].link;
    const url = songData.downloadUrl[4].link;
    
    //console.log(songData);
    const song = new Song(title,artist,album,cover,url);
    //song.getDetails();
    
    //console.log(song);
    return song; 
}

async function showResults() { 
    const songInput = document.getElementById("search-input");
    const query = encodeURIComponent(songInput.value); 
    const res = await fetch(`/search?q=${query}`).then(r => r.json());

    let results = res.data.results;
    console.log(results);
    let resultsDiv = document.getElementById("songResults");
    resultsDiv.style.display = "flex";
    resultsDiv.innerHTML = "";
    const truncate = (str, words) => str.split(' ').slice(0, words).join(' ') + (str.split(' ').length > words ? '...' : '');

    for (let i = 0; i < results.length; i++) {

        let thisSong = results[i];
        let isExplicit = thisSong.explicitContent === 1;
        const songItem = document.createElement("div");
        songItem.classList.add("songResult");

        songItem.style.backgroundImage = `url(${thisSong.image[thisSong.image.length - 1].link})`;
        songItem.style.backgroundSize = 'cover';
        songItem.style.backgroundPosition = 'center';

        const songName = document.createElement("span");
        songName.classList.add("resultName");
        songName.innerHTML = truncate(thisSong.name, 3);
        songItem.appendChild(songName);

        const songArtist = document.createElement("span");
        songArtist.classList.add("resultArtist");
        songArtist.innerHTML = truncate(thisSong.primaryArtists, 2);
        songItem.appendChild(songArtist);

        const songAlbum = document.createElement("span");
        songAlbum.classList.add("resultAlbum");
        songAlbum.innerHTML = truncate(thisSong.album.name, 2);
        songItem.appendChild(songAlbum);

        const previewBtn = document.createElement("span");
        previewBtn.classList.add("previewBtn");
        previewBtn.innerHTML = "▶";
        previewBtn.onclick = async (e) => {
            e.stopPropagation();
            
            if (previewSound && previewSound.playing()) {
                previewSound.stop();
                previewBtn.innerHTML = "▶";
                return;
            }

            previewBtn.innerHTML = "⏹";
            const res = await fetch(`/preview?title=${encodeURIComponent(thisSong.name)}&artist=${encodeURIComponent(thisSong.primaryArtists)}`).then(r => r.json());
            if (res.previewUrl) previewSong(res.previewUrl);
        };
        songItem.appendChild(previewBtn);

        const downloadBtn = document.createElement("span");
        downloadBtn.classList.add("downloadBtn");
        downloadBtn.innerHTML = "Download";
        downloadBtn.onclick = async (e) => {
            e.stopPropagation();
            const song = new Song(
                thisSong.name,
                thisSong.primaryArtists,
                thisSong.album.name,
                thisSong.image[thisSong.image.length - 1].link,
                thisSong.downloadUrl[4].link,
                thisSong.explicitContent === 1
            );
            await song.download();
            updateSonglist(song);
        };
        songItem.appendChild(downloadBtn);

        if (isExplicit) {
            const explicitTag = document.createElement("span");
            explicitTag.classList.add("explicit");
            explicitTag.innerHTML = "Explicit";
            songItem.appendChild(explicitTag);
        }

        songItem.onclick = null;


        resultsDiv.appendChild(songItem);
        //console.log(`\n${thisSong.title} by ${thisSong.artist} (${thisSong.album})`);

    }
}

let previewSound = null;

function previewSong(url) {
    if (previewSound) {
        previewSound.stop();
        previewSound.unload();
    }

    previewSound = new Howl({
        src: [url],
        format: ['m4a'],
        html5: true,
    });

    previewSound.play();
}

async function selectSong(thisSong) {
    if (sound) {
        sound.stop();
    }
    resetVisualizer();

    // load lyrics once on select, not every play
    await fetchLyrics(thisSong);

    sound = new Howl({
        src: [`${thisSong.src}`],
        volume: parseFloat(volumeSlider.value),
        format: ['mp4'],
        html5: true,
        onloaderror: (id, err) => console.error("Load error:", err),
        onplayerror: (id, err) => console.error("Play error:", err),
        onend: function() { 
            playSong() 
        },
        onplay: function() {
            setupVisualizer();
            document.getElementById("songResults").style.display = "none";
        }
    });

    const cover = document.getElementById("album-cover");
    cover.style.opacity = 0;
    setTimeout(() => {
        cover.src = thisSong.cover;
        cover.onload = () => { cover.style.opacity = 1 };
    }, 400);

    playing = false;
    playSong();
}

function playSong() {
    document.getElementById('lyrics').innerHTML = '';
    if (sound == null) return
    let btn = document.getElementById("playBtn");
    if (playing == false) {
        sound.play()
        playerInterval = setInterval(updatePlayer, 10)
        btn.innerHTML = "❚❚";
        playing = true;
        startLogging() ;
    // remove startLogging() from here
    } else {
        sound.pause()
        clearInterval(playerInterval)
        btn.innerHTML = "▶︎";
        playing = false;
        stopLogging();
    }
}

function updatePlayer() {
    let player = document.getElementById("music-slider");
    let time = document.getElementById("music-time");
    player.min = 0;
    player.max = sound.duration();
    player.value = sound.seek();
    time.innerHTML = formatTime(sound.seek())
    updateLyrics();
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

function seekSong(value) {
    sound.seek(value);
    updatePlayer();
}

const volumeSlider = document.getElementById('volume-slider')

volumeSlider.oninput = function() {
  sound.volume(this.value)
}

async function loadSonglist() {
    const folders = await fetch('/songs').then(r => r.json());
    console.log('folders:', folders);

    const songs = document.getElementById("songs");
    songs.innerHTML = "";

    for (let folder of folders) {
        const info = await fetch(`/info/${encodeURIComponent(folder)}`).then(r => r.json());
        console.log('info:', info);
        
        const songObj = new Song(info.title, info.artist, info.album, info.cover, null, info.explicit);
        songObj.src = `/Music/${folder}/${folder}.mp4`;
        updateSonglist(songObj);
    }

    console.log("Songlist: " , songList);
}

function updateSonglist(songObj) {
    const newSong = document.createElement("button");
    newSong.innerHTML = `${songObj.title} | ${songObj.artist}`;
    newSong.onclick = () => selectSong(songObj);
    document.getElementById("songs").appendChild(newSong);
    songList.push(songObj);
}

