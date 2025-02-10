function presentMessage(file) {
    return new Promise((resolve) => {
        var audio = new Audio(`../audio/speech/${file}.m4a`);
        audio.play();

        fetch(`../audio/speech/transcripts.json`)
            .then((response) => response.json())
            .then((transcripts) => {
                setDisplayText(transcripts[file] || "");
            });

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
            // var elevatorAudio = new Audio("../audio/elevator.mp3");
            // elevatorAudio.play();

            setDisplayText("");

            // var wellnessAudio = new Audio("../audio/other/music.m4a");
            // wellnessAudio.loop = true;
            // wellnessAudio.play();

            // await new Promise((resolve) => setTimeout(resolve, 1000));
            // await presentMessage("hello");
            await main();
        },
        { once: true }
    );
});

async function main() {
    // while (true) {
    //     await new Promise((resolve) => setTimeout(resolve, 2000));
    //     await presentMessage("latest_fact");
    // }
}
