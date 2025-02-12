async function fetchTranscripts() {
    const response = await fetch("../audio/transcripts.json");
    transcripts = await response.json();
}

async function presentMessage(filename) {
    return new Promise((resolve) => {
        console.log("Playing " + filename);

        const audio = new Audio(`../audio/speech/${filename}`);

        audio.addEventListener("canplaythrough", () => {
            const transcript = transcripts[filename] || "";
            const characterUpdateRate = Math.floor(
                (audio.duration * 1000) / transcript.length - 10
            );
            setDisplayText(transcript, characterUpdateRate);
            audio.play();
        });

        audio.addEventListener("ended", async () => {
            await wait(750);
            setDisplayText("");
            resolve();
        });
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

setDisplayText(
    "Click to start wellness session. Adjust equipment for optimal audio therapy.", 28
);

window.addEventListener("load", function () {
    document.body.addEventListener(
        "click",
        async () => {
            await main();
        },
        { once: true }
    );
});

let transcripts = {};

async function main() {
    setDisplayText("", 0);

    await new Promise((resolve) => {
        const audio = new Audio("../audio/other/elevator.mp3");
        audio.addEventListener(
            "canplaythrough",
            async () => {
                audio.play();

                setDisplayText("Elevator going down", 0);
                await wait(1100);
                setDisplayText("Elevator going down.", 0);
                await wait(1100);
                setDisplayText("Elevator going down..", 0);
                await wait(1100);
                setDisplayText("Elevator going down...", 0);
                await wait(1100);
                setDisplayText("Elevator arrived on severed floor.", 15);
                await wait(2000)
                setDisplayText("");
            },
            { once: true }
        );

        audio.addEventListener("ended", () => {
            resolve();
        });
    });

    const wellnessAudio = new Audio("../audio/other/music.m4a");
    wellnessAudio.loop = true;

    wellnessAudio.addEventListener(
        "canplaythrough",
        async () => {
            wellnessAudio.play();

            await wait(4500);
            await fetchTranscripts();
            await presentMessage("hello.mp3");

            const facts = getRandomizedFactList();
            let i = 0;
            while (true) {
                await wait(1000);
                await presentMessage(facts[i]);
                i = (i + 1) % facts.length;
            }
        },
        { once: true }
    );
}
