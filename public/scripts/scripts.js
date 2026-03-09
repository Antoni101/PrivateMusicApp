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

async function selectSong(thisSong) {
    if (sound) {
        sound.stop();
    }
    resetVisualizer();

    // load lyrics once on select, not every play
    document.getElementById('lyrics').innerHTML = '';
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
            let songInfo = document.getElementById("songInfo");
            songInfo.innerHTML = `Playing: ${thisSong.title} by ${thisSong.artist}`;  
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

    await musicBot(thisSong);
    
}

function playSong() {
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
    const newSong = document.createElement("div");
    newSong.classList.add("songItem");

    const songName = document.createElement("span");
    songName.innerHTML = `${songObj.title} | ${songObj.artist}`.slice(0, 30) + " -";

    if (songObj.explicit == true) { songName.innerHTML += " 🅴" }
    newSong.onclick = () => selectSong(songObj);
    
    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "✕";
    deleteBtn.classList.add("deleteBtn");
    deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        await songObj.delete();
        songList = songList.filter(s => s.folderName !== songObj.folderName);
        newSong.remove();
    };

    newSong.appendChild(songName);
    newSong.appendChild(deleteBtn);
    document.getElementById("songs").appendChild(newSong);
    songList.push(songObj);
}

