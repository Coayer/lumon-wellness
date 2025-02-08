function presentMessage(message) {
    return new Promise((resolve) => {
        fetch(`../transcripts/${message}.txt`)
            .then((response) => response.text())
            .then((text) => {
                setDisplayText(text);
            });

        var audio = new Audio(`../audio/${message}.wav`);
        audio.play();

        audio.addEventListener("ended", function () {
            setDisplayText("");
            resolve();
        });
    });
}

window.addEventListener("load", function () {
    document.body.addEventListener(
        "click",
        async () => {
            var audio = new Audio("../audio/elevator.m4a");
            audio.play();

            setDisplayText("");

            await new Promise((resolve) => setTimeout(resolve, 2000));
            var noiseAudio = new Audio("../audio/noise.m4a");
            noiseAudio.loop = true;
            noiseAudio.play();

            var wellnessAudio = new Audio("../audio/wellness.m4a");
            wellnessAudio.loop = true;
            wellnessAudio.play();

            await new Promise((resolve) => setTimeout(resolve, 1000));
            await presentMessage("greeting");
            await main();
        },
        { once: true }
    );
});

async function main() {
    while (true) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await presentMessage("latest_fact");
    }
}
