import math
import random
import struct
import wave
from pathlib import Path


OUT = Path("public/soft-portfolio-bed.wav")
SAMPLE_RATE = 44_100
DURATION = 58.0


def env(t: float) -> float:
    fade_in = min(1.0, t / 4.5)
    fade_out = min(1.0, max(0.0, (DURATION - t) / 5.5))
    slow_bloom = 0.82 + 0.18 * math.sin(t * 0.34)
    return fade_in * fade_out * slow_bloom


def tone(t: float, freq: float, drift: float, phase: float) -> float:
    return math.sin((2 * math.pi * freq * t) + math.sin(t * drift + phase) * 0.035)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    random.seed(7)
    frames = int(SAMPLE_RATE * DURATION)

    notes = [
        (110.00, 0.12, 0.21, 0.0),
        (164.81, 0.10, 0.19, 1.3),
        (220.00, 0.08, 0.17, 2.2),
        (246.94, 0.06, 0.14, 0.7),
        (329.63, 0.035, 0.11, 1.9),
    ]

    with wave.open(str(OUT), "w") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)

        last_noise = 0.0
        for i in range(frames):
            t = i / SAMPLE_RATE
            shimmer = 0.0
            for freq, gain, drift, phase in notes:
                shimmer += gain * tone(t, freq, drift, phase)

            breath = 0.018 * math.sin(2 * math.pi * 0.067 * t)
            last_noise = (last_noise * 0.996) + (random.uniform(-1, 1) * 0.004)
            sample = (shimmer + breath + last_noise) * env(t) * 0.42

            left = sample * (0.94 + 0.06 * math.sin(t * 0.13))
            right = sample * (0.94 + 0.06 * math.cos(t * 0.11))

            wav.writeframesraw(struct.pack("<hh", int(left * 32767), int(right * 32767)))

    print(OUT.resolve())


if __name__ == "__main__":
    main()
