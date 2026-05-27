import { ttsSave } from './node_modules/edge-tts/out/index.js'

const script = `
Meet La Ultra: Run and Bee, a movement and mindfulness app by Dr. Rajat Chauhan.
Before you train, it asks the question most fitness apps skip: how does your body feel today?
Start with a two-minute Feel check-in across body, mind, and movement.
Your score can adjust the day's run, so the plan bends before your body breaks.
Then breathe at five breaths per minute with a calm timer and metronome.
Open the movement library for functional tests, strength tools, and running drills, each with precise clinical cues.
When you're ready to run, the coach builds weekly plans, calculates pace zones, logs check-ins, and answers running questions with your recent history in view.
History turns Feel, workouts, readiness, and quality into trends you can understand.
Sign in with Google or use guest mode.
Add it to your home screen; it works offline.
La Ultra: Run and Bee.
Listen first. Then move.
`

await ttsSave(script.trim(), './public/commercial-voice-soft.mp3', {
  voice: 'en-US-JennyNeural',
  rate: '+2%',
  pitch: '-2Hz',
  volume: '+0%',
})
