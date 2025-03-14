async function fetchTranscripts() {
    const response = await fetch("../audio/transcripts.json");
    transcripts = await response.json();
}

async function presentMessage(filename) {
    return new Promise((resolve) => {
        console.log(`Playing ${filename}`)

        fgAudio.src = `../audio/speech/${filename}`;
        const transcript = transcripts[filename] || "";

        fgAudio.addEventListener(
            "playing",
            async () => {
                const characterUpdateRate = Math.floor(
                    (fgAudio.duration * 1000) / transcript.length - 10
                );
                setDisplayText(transcript, characterUpdateRate);
            },
            { once: true }
        );

        fgAudio.addEventListener(
            "ended",
            async () => {
                await wait(750);
                setDisplayText("");
                resolve();
            },
            { once: true }
        );
    });
}

function getRandomizedFactList() {
    const facts = Object.keys(transcripts).filter(
        (fact) => fact !== "hello.mp3"
    );

    for (let i = facts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [facts[i], facts[j]] = [facts[j], facts[i]];
    }

    console.log("Fact order: " + facts);
    return facts;
}

async function main() {
    setDisplayText("", 0);

    console.log("Playing elevator.mp3");
    bgAudio.src = "../audio/other/elevator.mp3";
    await new Promise((resolve) =>
        bgAudio.addEventListener("playing", resolve, { once: true })
    );

    setDisplayText("Elevator going down", 0);
    await wait(1100);
    setDisplayText("Elevator going down.", 0);
    await wait(1100);
    setDisplayText("Elevator going down..", 0);
    await wait(1100);
    setDisplayText("Elevator going down...", 0);
    await wait(1100);
    setDisplayText("Elevator arrived on severed floor.", 15);
    await wait(2001);
    setDisplayText("");

    console.log("Playing music.m4a");
    bgAudio.loop = true;
    bgAudio.src = "../audio/other/music.m4a";
    await new Promise((resolve) =>
        bgAudio.addEventListener("playing", resolve, { once: true })
    );

    await wait(4000);
    await fetchTranscripts();
    await presentMessage("hello.mp3");

    const facts = getRandomizedFactList();
    let i = 0;
    while (true) {
        await wait(1000);
        await presentMessage(facts[i]);
        i = (i + 1) % facts.length;
    }
}

let bgAudio = null;
let fgAudio = null;

let transcripts = {};

setDisplayText(
    "Click to start wellness session. Adjust audio equipment for optimal relaxation.",
    28
);

window.addEventListener("load", function () {
    document.body.addEventListener(
        "click",
        () => {
            bgAudio = new Audio();
            bgAudio.autoplay = true;
            fgAudio = new Audio();
            fgAudio.autoplay = true;
            main();
        },
        { once: true }
    );
});
