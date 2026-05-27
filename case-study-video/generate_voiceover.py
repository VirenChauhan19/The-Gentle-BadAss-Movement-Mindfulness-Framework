import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "pydeps"))

import edge_tts

SCRIPT = """
La Ultra, Run and Bee is a portfolio case study about designing with one real person.
Dr. Rajat Chauhan is a sports medicine expert, author, runner, and my father.
His problem was clear: runners have more data than ever, but many have stopped listening to their bodies.

The research came from interviews, observation, and his clinical language.
The first prototypes failed in useful ways: streak pressure, generic cues, busy motion, and the wrong front door.

So the app changed.
It starts with Feel, a two minute readiness check.
It guides breathing with a calm orb.
It teaches movement through exact clinical cues.
And the running coach asks how the body feels before giving pace.

The evidence is the process: daily feedback, real testing, and one hundred sixty commits across sixteen active build days.
Not a fitness dashboard.
A practice for listening first, then moving.
"""


async def main():
    out = Path(__file__).parent / "public" / "case-study-voice-portfolio-58.mp3"
    communicate = edge_tts.Communicate(
        SCRIPT.strip(),
        voice="en-US-JennyNeural",
        rate="+8%",
        pitch="-2Hz",
        volume="+0%",
    )
    await communicate.save(str(out))
    print(out)


asyncio.run(main())
