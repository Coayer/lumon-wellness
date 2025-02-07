const onecolor = one.color;

function hex2vector(cssHex) {
    const pc = onecolor(cssHex);

    return vec3.fromValues(
        pc.red(),
        pc.green(),
        pc.blue()
    );
}

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

const bufferCanvas = document.createElement('canvas');
bufferCanvas.width = bufferW;
bufferCanvas.height = bufferH;

const bufferContext = bufferCanvas.getContext('2d');

bufferContext.fillStyle = '#000';
bufferContext.fillRect(0, 0, bufferW, bufferH);

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let lines = [];

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    for (let i = 0; i < lines.length; i++) {
        context.fillText(lines[i], x, y + i * lineHeight);
    }
}

const image = new Image();
image.src = 'lumon-logo.png';

function renderWorld() {
    // Clear the buffer
    bufferContext.fillStyle = '#000';
    bufferContext.fillRect(0, 0, bufferW, bufferH);
  
    // Set text properties
    bufferContext.textAlign = 'center';
    bufferContext.font = '15px "InputSans"';
    bufferContext.fillStyle = '#68b9cd';
  
    // Draw static text in the middle of the screen
    const staticText = "Your Oudy can identify the precise timbre of a rusty hinge after only a few seconds.";
    const maxWidth = bufferW - 20; // Adjust as needed
    const lineHeight = 14; // Adjust as needed
    const x = bufferW / 2;
    const y = bufferH / 2;
  
    wrapText(bufferContext, staticText, x, y, maxWidth, lineHeight);

    // Load and draw the image in the top right corner
    bufferContext.drawImage(image, 360, 10, 516/5, 226/5);
}

// init WebGL
const canvas = document.body.querySelector('canvas');
canvas.width = 640;
canvas.height = 480;

const regl = createREGL({
    canvas: canvas,
    attributes: { antialias: true, alpha: false, preserveDrawingBuffer: true }
});

const spriteTexture = regl.texture({
    width: 512,
    height: 256,
    mag: 'linear'
});

const termFgColor = hex2vector('#68b9cd');
const termBgColor = hex2vector('#002a2a');

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

        #define textureW ${textureW + '.0'}
        #define textureH ${textureH + '.0'}
        #define consoleW ${consoleW + '.0'}
        #define consoleH ${consoleH + '.0'}
        #define consolePadUVW ${consolePad / consoleW}
        #define consolePadUVH ${consolePad / consoleH}
        #define charUVW ${charW / consoleW}
        #define charUVH ${charH / consoleH}

        void main() {
            // @todo use uniform
            vec2 consoleWH = vec2(consoleW, consoleH);

            // @todo use uniforms
            float glitchFlutter = mod(time * 40.0, 1.0); // timed to be slightly out of sync from main frame rate

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

                distortedUVPosition.x -= 0.011 * (glitchFlutter * glitchFlutter * glitchFlutter);

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
            [ -1, -1, 0 ],
            [ 1, -1, 0 ],
            [ -1, 1, 0 ],
            [ 1, 1, 0 ]
        ])
    },

    uniforms: {
        time: regl.context('time'),
        camera: regl.prop('camera'),
        sprite: spriteTexture,
        bgColor: regl.prop('bgColor'),
        fgColor: regl.prop('fgColor')
    },

    primitive: 'triangle strip',
    count: 4,

    depth: {
        enable: false
    },

    blend: {
        enable: true,
        func: {
            src: 'src alpha',
            dst: 'one minus src alpha'
        }
    }
});

regl.clear({
    depth: 1,
    color: [ 0, 0, 0, 1 ]
});

// main loop
function rafBody() {
  renderWorld();  

  regl.poll();
  spriteTexture.subimage(bufferContext, consolePad, consolePad);
  quadCommand({
      bgColor: termBgColor,
      fgColor: termFgColor
  });

  requestAnimationFrame(rafBody);
}

// kickstart the loop
rafBody();
