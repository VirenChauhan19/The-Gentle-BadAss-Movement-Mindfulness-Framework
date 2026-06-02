import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "pydeps"))

import edge_tts

SCRIPT = """
Meet La Ultra: Run and Bee.
A movement and mindfulness app built around one simple idea:
listen first, then move.

Before a run, start with Feel.
Rate what is actually happening across body, mind, and movement.
Your score helps shape the day, so a hard session can become breath work,
mobility, recovery, or an easier run when your body asks for it.

Then settle into five breaths per minute with a calm breathing timer and metronome.
Open Move for functional tests, strength tools, and running drills,
each guided by precise clinical cues.

When you are ready to train, the running coach builds plans,
calculates pace zones, logs check-ins, and keeps your recent history in view.

Over time, History turns Feel, readiness, workouts, and quality into patterns you can understand.

La Ultra: Run and Bee.
No pressure. No noise.
Just a quieter way to train.
"""


async def main():
    out = Path(__file__).parent / "public" / "commercial-voice-smooth.mp3"
    communicate = edge_tts.Communicate(
        SCRIPT.strip(),
        voice="en-US-AvaNeural",
        rate="-3%",
        pitch="-1Hz",
        volume="+0%",
    )
    await communicate.save(str(out))
    print(out)


asyncio.run(main())
