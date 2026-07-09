const audioCtx = new window.AudioContext();

let muted: boolean = false;

let letterBuffer: AudioBuffer;
let correctBuffer: AudioBuffer;
let wrongBuffer: AudioBuffer;

export function isMuted() {
    return muted;
}

export function toggleMute() {
    muted = !muted;
    localStorage.setItem("muted", String(muted));
    return muted;
}

muted = localStorage.getItem("muted") === "true";

async function loadSound(url: string) {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
}

correctBuffer = await loadSound("/assets/sounds/correct.mp3");
wrongBuffer = await loadSound("/assets/sounds/wrong.mp3");
letterBuffer = await loadSound("/assets/sounds/letter.mp3");

export function playBuffer(buffer: AudioBuffer, playbackRate = 1) {
    if (muted) {return;}

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    source.connect(audioCtx.destination);
    source.start(0);
}

export function playLetterSound(index: number) {
    const semitoneRatio = Math.pow(2, 1 / 12);

    const steps = Math.min(index - 1, 11); // cap at 12 notes
    const rate = Math.pow(semitoneRatio, steps);

    playBuffer(letterBuffer, rate);
}

export { correctBuffer, wrongBuffer }