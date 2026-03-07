let sound = null
let playerInterval = null
let playing = false;

let results = [];

class Song {
    constructor(title, artist, album, cover, url) {
        this.title = title;
        this.artist = artist;
        this.album = album;
        this.cover = cover;
        this.src = null;
        this.url = url;

    }

    async download() {
        await fetch(`/download?url=${encodeURIComponent(this.url)}&filename=${encodeURIComponent(`${this.title}-${this.artist}`)}`);
        this.src = `/music/${this.title}-${this.artist}.mp4`;
        return this.src;
    }

    /*
    async download() {
        const url = await getMp3(this.title, this.artist);
        
        // save it to the Music folder
        await fetch(`/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(this.src)}`);
        
        this.file = `Music/${this.src}.mp4`;
        return this.mp3;
    }
    */

    getDetails() {
        console.log(`\nTitle: ${this.title}\nAlbum: ${this.album}\nArtist: ${this.artist}\nCover URL: ${this.cover}\nPreview URL: ${this.preview}\nSRC: ${this.src}`);
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

    for (let i = 0; i < results.length; i++) {

        let thisSong = results[i];
        const songItem = document.createElement("div");
        songItem.classList.add("songResult");
        songItem.innerHTML = `${thisSong.name} \nby ${thisSong.primaryArtists} (${thisSong.album.name})`;
        songItem.onclick = async () => {
            resultsDiv.style.display = "None";
            const song = await getSong(thisSong.name, thisSong.primaryArtists);
            await song.download();
            updateSonglist(song);
            selectSong(song);
        }

        resultsDiv.appendChild(songItem);
        //console.log(`\n${thisSong.title} by ${thisSong.artist} (${thisSong.album})`);

    }
}

async function selectSong(thisSong) {
    if (sound) {
        sound.stop()
    }
    resetVisualizer()
    
    sound = new Howl({
        src: [`${thisSong.src}`],
        volume: parseFloat(volumeSlider.value),
        format: ['mp4'],
        html5: true,
        onloaderror: (id, err) => console.error("Load error:", err),
        onplayerror: (id, err) => console.error("Play error:", err),
        onend: function() { playSong() },
        onplay: function() {
            setupVisualizer() 
            fetchLyrics(`${thisSong.artist} ${thisSong.title}`);
        }
    })

    const cover = document.getElementById("album-cover");
    cover.style.opacity = 0
    setTimeout(() => {
        cover.src = thisSong.cover;
        cover.onload = () => { cover.style.opacity = 1 }
    }, 400)

    /*
    if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
        title: thisSong.title,
        artist: thisSong.artist,
        album: thisSong.album,
        artwork: [{ src: thisSong.cover }]
    });
    */


    lyrics = []
    document.getElementById('lyrics').innerHTML = ''
    playing = false;
    playSong()
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

    const files = await fetch('/songs').then(r => r.json());


    const songs = document.getElementById("songs");
    songs.innerHTML = "";
    for (let file of files) {
        const name = file.replace('.mp4', '').replace('.mp3', '');
        const [title, artist] = name.split('-');

        const songObj = await getSong(title,artist)
        songObj.src = `Music/${file}`;
        updateSonglist(songObj);
        //console.log(songList[i]);
    }
}

function updateSonglist(songObj) {
    const newSong = document.createElement("button");
    newSong.innerHTML = `${songObj.title}-${songObj.artist}`;
    newSong.onclick = () => selectSong(songObj);
    document.getElementById("songs").appendChild(newSong);
}

