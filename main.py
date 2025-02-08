import sox
import wave
import sys
import io
import os
import logging
import time
import threading
from scipy.io import wavfile
from piper.voice import PiperVoice
from ollama import chat
from ollama import ChatResponse
from http.server import HTTPServer, BaseHTTPRequestHandler

REFRESH_PERIOD = 5
AUDIO_PATH = "www/static/audio/"
TRANSCRIPT_PATH = "www/static/transcripts/"


class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        logging.info("Received ping from " + self.address_string())
        global latest_ping
        latest_ping = time.time()
        self.send_response(200)
        self.end_headers()


def run_server():
    server = HTTPServer(
        ("localhost", int(sys.argv[1]) if len(sys.argv) == 2 else 8081), RequestHandler
    )
    server.serve_forever()


def synthesize_voice(text: str, output_path: str):
    logging.info(f"Synthesizing to {output_path}: {text}")

    try:
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, "wb") as wav_file:
            VOICE_MODEL.synthesize(text, wav_file, length_scale=1.2, sentence_silence=1)

        wav_buffer.seek(0)
        sample_rate, speech_audio = wavfile.read(wav_buffer)

        tfm = sox.Transformer()
        tfm.set_input_format(
            file_type="wav", rate=22050, channels=1, bits=16, encoding="signed-integer"
        )

        tfm.highpass(100)
        tfm.lowpass(8000)
        tfm.gain(-7.5)
        tfm.pitch(-1)
        tfm.reverb(30, 50, 40)
        tfm.echo(0.8, 0.9, 2, [400, 700], [0.2, 0.1])

        duration = len(speech_audio) / sample_rate
        tfm.pad(0, max(0, REFRESH_PERIOD - duration))

        tfm.build_file(
            input_array=speech_audio,
            sample_rate_in=sample_rate,
            output_filepath=output_path,
        )
    except Exception as e:
        logging.error(f"Failed to synthesize voice: {e}")


def generate_fact():
    try:
        response: ChatResponse = chat(
            model="gemma2:2b",
            messages=[
                {
                    "role": "system",
                    "content": """Answer with VERY short, factual statements WITHOUT using emojis or showing any negativity.""",
                },
                {
                    "role": "user",
                    "content": f"""You are a therapist that compliments people's "Oudy". For example, 
                    "Your Oudy knows a beautiful rock from a plain one." 
                    Create another complement which is ridiculous but realistic. Do not include emojis, juggling, whistling, uncanny, balance, ability, doing something WHILE something, or any negativity. It should be a VERY short, factual statement, beginning with "Your Oudy can" or "Your Oudy is".""",
                },
            ],
        )

        return response.message.content.rstrip()
    except Exception as e:
        logging.error(f"Failed to generate new fact: {e}")
        return "I'm sorry. Please don't respond to any specific fact."


def synthesize_greeting():
    greeting = "I'd like to share with you some facts about your Oudy. Try to enjoy each fact equally."
    synthesize_voice(greeting, AUDIO_PATH + "greeting.wav")
    write_transcript(greeting, "greeting.txt")


def write_transcript(text: str, path: str):
    text = text.replace("Oudy", "Outie")
    with open(TRANSCRIPT_PATH + path, "w") as f:
        f.write(text)


def main():
    server_thread = threading.Thread(target=run_server)
    server_thread.daemon = True
    server_thread.start()

    synthesize_greeting()

    latest_fact_refresh = 0

    while True:
        now = time.time()
        if (
            now - latest_ping < REFRESH_PERIOD
            and now - latest_fact_refresh > REFRESH_PERIOD
        ):
            logging.info("Generating new fact...")

            fact = generate_fact()
            synthesize_voice(fact, AUDIO_PATH + "latest_fact.wav")
            write_transcript(fact, "latest_fact.txt")
            latest_fact_refresh = time.time()

        time.sleep(0.5)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    logging.getLogger("sox").setLevel(logging.ERROR)

    VOICE_MODEL = PiperVoice.load("piper/en_US-amy-medium.onnx")
    logging.info("Voice model loaded")

    if not os.path.isdir(TRANSCRIPT_PATH):
        os.makedirs(TRANSCRIPT_PATH)

    latest_ping = time.time()

    main()
