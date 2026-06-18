function createSongElement(thisSong) {

    const truncate = (str, words) => str.split(' ').slice(0, words).join(' ') + (str.split(' ').length > words ? '...' : '');
    let isExplicit = thisSong.explicitContent === 1;
    const songItem = document.createElement("div");
    songItem.classList.add("songResult");

    songItem.style.backgroundImage = `url(${thisSong.artworkUrl100})`;
    songItem.style.backgroundSize = 'cover';
    songItem.style.backgroundPosition = 'center';

    const songName = document.createElement("span");
    songName.classList.add("resultName");
    songName.innerHTML = truncate(thisSong.trackName, 3);
    songItem.appendChild(songName);

    const songArtist = document.createElement("span");
    songArtist.classList.add("resultArtist");
    songArtist.innerHTML = truncate(thisSong.artistName, 2);
    songItem.appendChild(songArtist);

    const songAlbum = document.createElement("span");
    songAlbum.classList.add("resultAlbum");
    songAlbum.innerHTML = truncate(thisSong.collectionName, 2);
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
        previewSong(thisSong.previewUrl);
    };
    songItem.appendChild(previewBtn);

    const downloadBtn = document.createElement("span");
    downloadBtn.classList.add("downloadBtn");
    downloadBtn.innerHTML = "Upload";
    downloadBtn.onclick = async (e) => {
        e.stopPropagation();
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/*";
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            downloadBtn.innerHTML = "Uploading...";
            downloadBtn.style.pointerEvents = "none";

            const formData = new FormData();
            formData.append("file", file);
            formData.append("filename", `${thisSong.trackName}-${thisSong.artistName}`);
            formData.append("metadata", JSON.stringify({
                title: thisSong.trackName,
                artist: thisSong.artistName,
                album: thisSong.collectionName,
                cover: thisSong.artworkUrl100,
                explicit: thisSong.contentAdvisoryRating === "Explicit"
            }));

            await fetch("/upload", { method: "POST", body: formData });
            const song = new Song(thisSong.trackName, thisSong.artistName, thisSong.collectionName, thisSong.artworkUrl100, null);
            song.src = `/Music/${song.folderName}/${song.folderName}.mp3`;
            updateSonglist(song);
            downloadBtn.innerHTML = "Uploaded";
        };
        input.click();
    };
    songItem.appendChild(downloadBtn);

    if (isExplicit) {
        const explicitTag = document.createElement("span");
        explicitTag.classList.add("explicit");
        explicitTag.innerHTML = "Explicit";
        songItem.appendChild(explicitTag);
    }

    songItem.onclick = null;
    return songItem;
}

async function showSuggestions(query) {
    const res = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&limit=8`)
    const data = await res.json();

    let results = data.results;
    let resultsDiv = document.getElementById("songResults");
    resultsDiv.innerHTML = "";
    document.getElementById("suggestions").innerHTML = "";
    const seen = new Set();
    
    for (let i = 0; i < results.length; i++) {
        
        let song = results[i];
        let songName = song.trackName;
        let songArtist = song.artistName;

        const key = `${songName}|${songArtist}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        let suggestionItem = document.createElement("div");
        suggestionItem.classList.add("songSuggestion");

        let suggestionTitle = document.createElement("span");
        suggestionTitle.classList.add("sugTitle");
        suggestionTitle.innerHTML = songName;

        let suggestionArtist = document.createElement("span");
        suggestionArtist.classList.add("sugArtist");
        suggestionArtist.innerHTML = songArtist;

        suggestionItem.appendChild(suggestionTitle);
        suggestionItem.appendChild(suggestionArtist);

        suggestionItem.onclick = async () => {
            document.getElementById("search-input").value = `${songName} ${songArtist}`;
            await showResults();
            document.getElementById("suggestions").innerHTML = "";
        }

        document.getElementById("suggestions").appendChild(suggestionItem);

        //console.log(`${songName} ${songArtist}`);
    }
}

async function showResults() {
    const songInput = document.getElementById("search-input");
    document.getElementById("suggestions").innerHTML = "";
    const query = encodeURIComponent(songInput.value);
    const res = await fetch(`/search?q=${query}`).then(r => r.json());

    let results = res.results;
    console.log(results);
    let resultsDiv = document.getElementById("songResults");
    resultsDiv.style.display = "flex";
    resultsDiv.innerHTML = "";

    for (let i = 0; i < results.length; i++) {
        let thisSong = results[i];
        let songItem = createSongElement(thisSong);
        songItem.style.animationDelay = `${i * 100}ms`;
        resultsDiv.appendChild(songItem);
    }
}

let debounceTimer;
document.getElementById("search-input").addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        showSuggestions(e.target.value);
    }, 100);
});

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