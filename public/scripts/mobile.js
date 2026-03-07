document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
       
    }
});

async function unlockAudio() {
    if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
    }
}

function keepAudioAlive() {
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.loop = true;
    source.start();
}