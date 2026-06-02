import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "pydeps"))

import edge_tts

SCENES = [
    (
        "01-hook",
        "Meet La Ultra: Run and Bee. Listen first, then move.",
    ),
    (
        "02-feel",
        "Start with Feel. Before the run, rate what is really happening across body, mind, and movement.",
    ),
    (
        "03-plan",
        "Your Plan adapts to Feel, shifting low-readiness days toward recovery or easier running.",
    ),
    (
        "04-breathe",
        "Then Breathe. A five BPM timer and metronome help settle your system before training starts.",
    ),
    (
        "05-move",
        "Mobility and Strength keep it practical: functional tests, strength tools, and running drills with clinical cues.",
    ),
    (
        "06-running",
        "The Running tab builds plans, calculates pace zones, logs check-ins, and keeps your recent history in view.",
    ),
    (
        "07-progress",
        "Progress turns Feel, readiness, workouts, and quality into patterns you can understand.",
    ),
    (
        "08-end",
        "La Ultra: Run and Bee. Add it to your home screen, sign in or use guest mode, and train without the noise.",
    ),
]


async def save_scene(scene_id: str, text: str, out_dir: Path) -> None:
    communicate = edge_tts.Communicate(
        text,
        voice="en-US-AvaNeural",
        rate="+8%",
        pitch="-1Hz",
        volume="+0%",
    )
    await communicate.save(str(out_dir / f"{scene_id}.mp3"))


async def main():
    out_dir = Path(__file__).parent / "public" / "commercial-scenes"
    out_dir.mkdir(parents=True, exist_ok=True)
    for scene_id, text in SCENES:
        await save_scene(scene_id, text, out_dir)
        print(out_dir / f"{scene_id}.mp3")


asyncio.run(main())
