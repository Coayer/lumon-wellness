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
        (fact) => fact !== "hello.m4a"
    );

    for (let i = facts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [facts[i], facts[j]] = [facts[j], facts[i]];
    }

    console.log("Fact order: " + facts);
    return facts;
}

setDisplayText(
    "Click"// to start wellness session"//. Adjust equipment for optimal audio therapy."
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
            () => {
                audio.play();
                animateElevatorImages();
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

            await wait(1500);

            await fetchTranscripts();
            await presentMessage("hello.m4a");

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
