import sox
import wave
import sys
import io
import logging
import time
import threading
from scipy.io import wavfile
from piper.voice import PiperVoice
from ollama import chat
from ollama import ChatResponse
from http.server import HTTPServer, BaseHTTPRequestHandler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logging.getLogger('sox').setLevel(logging.ERROR)

REFRESH_PERIOD = 5

VOICE_MODEL = PiperVoice.load("piper/en_US-amy-medium.onnx")
logging.info("Voice model loaded")

latest_ping = time.time()

class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        logging.info("Received ping from " + self.address_string())
        global latest_ping
        latest_ping = time.time()
        self.send_response(200)
        self.end_headers()

def run_server():
    server = HTTPServer(('localhost', int(sys.argv[1]) if len(sys.argv) == 2 else 80), RequestHandler)
    server.serve_forever()

def synthesize_voice(text: str, output_path: str):
    logging.info(f"Synthesizing to {output_path}: {text}")

    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, "wb") as wav_file:
        VOICE_MODEL.synthesize(text, wav_file, length_scale=1.2)

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

    tfm.build_file(
        input_array=speech_audio, sample_rate_in=sample_rate, output_filepath=output_path
    )
    

def main():
    server_thread = threading.Thread(target=run_server)
    server_thread.daemon = True
    server_thread.start()

    latest_fact_refresh = 0
    
    while True:
        now = time.time()
        if now - latest_ping < REFRESH_PERIOD and now - latest_fact_refresh > REFRESH_PERIOD:
            logging.info("Creating new statement...")

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
                        Create another complement which is ridiculous but realistic. Do not include emojis, juggling, whistling, uncanny, balance, ability, doing something WHILE something, or any negativity. It should be a VERY short, factual statement, beginning with "Your Oudy can" or "Your Oudy is"."""
                    },
                ],
            )

            synthesize_voice(response.message.content.rstrip(), "latest_fact.wav")

            latest_fact_refresh = time.time()

        time.sleep(0.5)


if __name__ == "__main__":
    main()
