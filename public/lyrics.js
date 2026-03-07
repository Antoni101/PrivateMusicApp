function parseLyrics(syncedLyrics) {
    return syncedLyrics.split('\n').map(line => {
        const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/)
        if (!match) return null
        const minutes = parseFloat(match[1])
        const seconds = parseFloat(match[2])
        const text = match[3].trim()
        return { time: minutes * 60 + seconds, text }
    }).filter(Boolean)
}

let lyrics = []

async function fetchLyrics(songName) {
  const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(songName)}`)
  const data = await res.json()
  if (data.length && data[0].syncedLyrics) {
    lyrics = parseLyrics(data[0].syncedLyrics)
  }
}

let currentLine = ''

function updateLyrics() {
  const current = sound.seek()
  const line = lyrics.findLast(l => l.time <= current)
  
  if (line && line.text !== currentLine) {
    currentLine = line.text
    const el = document.getElementById('lyrics')
    
    el.style.opacity = 0
    el.style.filter = 'blur(10px)'
    el.style.transform = 'scale(0.95)'
    
    setTimeout(() => {
      el.innerHTML = line.text
      el.style.opacity = 1
      el.style.filter = 'blur(0px)'
      el.style.transform = 'scale(1)'
    }, 200)  // reduced from 200 to 50
  }
}