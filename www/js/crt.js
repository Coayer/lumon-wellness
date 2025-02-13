// Modified from Nick Matantsev's WebGL CRT Neon Matrix Effect
// https://codepen.io/unframework/pen/pqorjJ

function hex2vector(cssHex) {
    const pc = onecolor(cssHex);

    return vec3.fromValues(pc.red(), pc.green(), pc.blue());
}

function handleMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) / rect.width;
    const clickY = (event.clientY - rect.top) / rect.height;
    // console.log(clickX, clickY);

    // IDENTITY_LINK
    
    if (clickX > 0.84 && clickY > 0.89) {
        window.open("/copyright.txt", "_blank");
    }
}

function drawDisplayText() {
    const maxWidth = bufferW - 50;
    const lineHeight = 18;
    const x = 25;
    const y = bufferH / 2;

    const words = displayText.split(" ");
    let line = "";
    let lines = [];

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = bufferContext.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + " ";
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    for (let i = 0; i < lines.length; i++) {
        bufferContext.fillText(lines[i], x, y + i * lineHeight);
    }
}

function wait(ms = 1000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setDisplayText(text, updateDelay = 55) {
    displayText = "";
    for (let i = 0; i <= text.length; i++) {
        await wait(updateDelay);
        displayText = text.slice(0, i);
    }
}

function drawLine(startX, startY, endX, endY, lineWidth = 0.8) {
    bufferContext.strokeStyle = "#68b9cd";
    bufferContext.lineWidth = lineWidth;
    bufferContext.beginPath();
    bufferContext.moveTo(startX, startY); // Starting point (x, y)
    bufferContext.lineTo(endX, endY); // Ending point (x, y)
    bufferContext.stroke();
}

function renderWorld() {
    // Clear the buffer
    bufferContext.fillStyle = "#000";
    bufferContext.fillRect(0, 0, bufferW, bufferH);
    bufferContext.fillStyle = "#3ea1ba";

    drawLine(25, 15, 363, 15);

    // Session name
    const now = new Date();
    const dateString = now.toLocaleDateString();
    const timeString = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    bufferContext.font = '11px "InputSans"';
    bufferContext.textAlign = "left";
    bufferContext.fillText("Wellness Session with Ms. Casey", 25, 29);
    bufferContext.fillText(dateString + " " + timeString, 25, 44);

    // Lumon Logo
    bufferContext.drawImage(logo, 350, 3, 123, 60);
    
    // i'm drawing the line right here yall
    drawLine(25, 50, 363, 50);

    // Fact drawing
    bufferContext.font = '15px "InputSans"';
    drawDisplayText();

    drawLine(25, 220, 455, 220);

    bufferContext.font = '9px "InputSans"';
    // IDENTITY_TEXT

    bufferContext.font = '7px "InputSans"';
    bufferContext.fillText("Copyright", 419, 235);
}

const onecolor = one.color;

const charW = 6;
const charH = 10;
const bufferCW = 80;
const bufferCH = 24;
const bufferW = bufferCW * charW;
const bufferH = bufferCH * charH;
const textureW = 512;
const textureH = 256;

const consolePad = 8; // in texels
const consoleW = bufferW + consolePad * 2;
const consoleH = bufferH + consolePad * 2;

const bufferCanvas = document.createElement("canvas");
bufferCanvas.width = bufferW;
bufferCanvas.height = bufferH;

const bufferContext = bufferCanvas.getContext("2d");

bufferContext.fillStyle = "#000";
bufferContext.fillRect(0, 0, bufferW, bufferH);

const logo = new Image();
logo.src = "assets/lumon-logo.png";

let displayText = "";

// init WebGL
const canvas = document.body.querySelector("canvas");
canvas.width = 640;
canvas.height = 480;

canvas.addEventListener("mousedown", handleMouseDown);

const regl = createREGL({
    canvas: canvas,
    attributes: { antialias: true, alpha: false, preserveDrawingBuffer: true },
});

const spriteTexture = regl.texture({
    width: 512,
    height: 256,
    mag: "linear",
});

const termFgColor = hex2vector("#3ea1ba");
const termBgColor = hex2vector("#002a2a");

const quadCommand = regl({
    vert: `
        precision mediump float;

        attribute vec3 position;

        varying vec2 uvPosition;

        void main() {
            uvPosition = position.xy * vec2(0.5, -0.5) + vec2(0.5);

            gl_Position = vec4(
                vec2(-1.0, 1.0) + (position.xy - vec2(-1.0, 1.0)) * 1.0,
                0.0,
                1.0
            );
        }
    `,

    frag: `
        precision mediump float;

        varying vec2 uvPosition;
        uniform sampler2D sprite;
        uniform float time;
        uniform vec3 bgColor;
        uniform vec3 fgColor;

        #define textureW ${textureW + ".0"}
        #define textureH ${textureH + ".0"}
        #define consoleW ${consoleW + ".0"}
        #define consoleH ${consoleH + ".0"}
        #define consolePadUVW ${consolePad / consoleW}
        #define consolePadUVH ${consolePad / consoleH}
        #define charUVW ${charW / consoleW}
        #define charUVH ${charH / consoleH}

        void main() {
            // @todo use uniform
            vec2 consoleWH = vec2(consoleW, consoleH);

            vec2 center = uvPosition - vec2(0.5);
            float factor = dot(center, center) * 0.2;
            vec2 distortedUVPosition = uvPosition + center * (1.0 - factor) * factor;

            vec2 fromEdge = vec2(0.5, 0.5) - abs(distortedUVPosition - vec2(0.5, 0.5));

            if (fromEdge.x > 0.0 && fromEdge.y > 0.0) {
                vec2 fromEdgePixel = min(0.2 * consoleWH * fromEdge, vec2(1.0, 1.0));

                // simulate 2x virtual pixel size, for crisp display on low-res
                vec2 inTexel = mod(distortedUVPosition * consoleWH * 0.5, vec2(1.0));

                vec2 inTexelOffset = inTexel - 0.5;
                float scanlineAmount = inTexelOffset.y * inTexelOffset.y / 0.25;
                float intensity = 8.0 - scanlineAmount * 5.0; // ray intensity is over-amped by default
                vec2 uvAdjustment = inTexelOffset * vec2(0.0, .4 / consoleH); // remove vertical texel interpolation

                float rawFlutter = mod(time * 100.0, 1.0);
                float x = (rawFlutter - 0.5) * 4.0; // Shift and scale
                float glitchFlutter = exp(-x * x); // Gaussian-like falloff
                distortedUVPosition.x -= 0.006 * clamp(glitchFlutter, 0.2, 0.8);

                vec4 sourcePixel = texture2D(
                    sprite,
                    (distortedUVPosition - uvAdjustment) * consoleWH / vec2(textureW, textureH)
                );

                vec3 pixelRGB = sourcePixel.rgb * sourcePixel.a;

                // multiply by source alpha as well
                float screenFade = 1.0 - dot(center, center) * 1.8;
                float edgeFade = fromEdgePixel.x * fromEdgePixel.y;
                gl_FragColor = vec4(edgeFade * screenFade * mix(
                    bgColor,
                    fgColor,
                    intensity * pixelRGB
                ) * (1.0 - 0.2 * scanlineAmount), 0.2);
            } else {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
        }
    `,

    attributes: {
        position: regl.buffer([
            [-1, -1, 0],
            [1, -1, 0],
            [-1, 1, 0],
            [1, 1, 0],
        ]),
    },

    uniforms: {
        time: regl.context("time"),
        camera: regl.prop("camera"),
        sprite: spriteTexture,
        bgColor: regl.prop("bgColor"),
        fgColor: regl.prop("fgColor"),
    },

    primitive: "triangle strip",
    count: 4,

    depth: {
        enable: false,
    },

    blend: {
        enable: true,
        func: {
            src: "src alpha",
            dst: "one minus src alpha",
        },
    },
});

regl.clear({
    depth: 1,
    color: [0, 0, 0, 1],
});

// main loop
function rafBody() {
    renderWorld();

    regl.poll();
    spriteTexture.subimage(bufferContext, consolePad, consolePad);
    quadCommand({
        bgColor: termBgColor,
        fgColor: termFgColor,
    });

    requestAnimationFrame(rafBody);
}

// kickstart the loop
rafBody();
