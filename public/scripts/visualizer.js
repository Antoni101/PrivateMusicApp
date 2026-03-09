let audioContext, analyser, dataArray
let loggingInterval = null


function startLogging() {
    loggingInterval = setInterval(() => {
        getFrequencyData()
    }, 100)
}

function stopLogging() {
    clearInterval(loggingInterval)
    loggingInterval = null
}

function resetVisualizer() {
    if (audioContext) {
        audioContext.close()  // close old context
        audioContext = null
        analyser = null
        dataArray = null
    }
    stopLogging()
}

function setupVisualizer() {
    if (audioContext) return

    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 32

    const source = audioContext.createMediaElementSource(sound._sounds[0]._node)
    source.connect(analyser)
    analyser.connect(audioContext.destination)

    dataArray = new Uint8Array(analyser.frequencyBinCount);
    keepAudioAlive();
}

function createBars() {
  const visualizer = document.getElementById('vis')
  
  for (let i = 0; i < 16; i++) {  // match your dataArray length
    const bar = document.createElement('div')
    bar.classList.add('bars')
    visualizer.appendChild(bar)
  }
}

function getFrequencyData() {
    if (!analyser || !dataArray) return
    analyser.getByteFrequencyData(dataArray)

    const pageTitle =document.getElementById("pageTitle");
    const btn =document.getElementById("playBtn");
    const bass = dataArray[10] / 200; 
    pageTitle.style.transform = `scale(${1 + bass * 0.7})`;
    btn.style.transform = `scale(${1 + bass * 0.3})`;

    const children = document.getElementById("songs").children;
    
    //console.log("Bass: ",bass)

    const bars = document.querySelectorAll('.bars')
    bars.forEach((bar, i) => {
        bar.style.height = (dataArray[i] * 2) + 'px'  // 0-255px tall
    })
}