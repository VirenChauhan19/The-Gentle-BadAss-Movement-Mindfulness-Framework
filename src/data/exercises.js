export const EXERCISES = [
  // FUNCTIONAL TESTS
  {
    id: 'squat-test',
    category: 'functional',
    name: 'Squat',
    purpose: 'Assess hip mobility and lumbar stability under load.',
    cue: 'Hinge at the hip first, your knees follow, they do not lead. Keep the lumbar neutral throughout.',
    animation: 'squat',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Squats%20WebApp.mp4?alt=media&token=756557c6-a0ad-4102-a301-d2947b890cf9',
    steps: [
      'Stand feet shoulder-width, toes slightly out.',
      'Push your hips back and down, not your knees forward.',
      'Keep your chest tall and lumbar spine neutral (no rounding or arching).',
      'Lower until thighs are parallel, then drive through the heels to rise.'
    ],
    antiRotationNote: 'Watch for: lumbar rounding at the bottom. The spine stays long, hips do the work.'
  },
  {
    id: 'forward-bend',
    category: 'functional',
    name: 'Standing Forward Bend',
    purpose: 'Assess hamstring length and the hip-hinge pattern.',
    cue: 'Fold from the hips, not the lower back. Feel the stretch in the backs of the legs.',
    animation: 'forwardBend',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Standing%20forward%20bent.mp4?alt=media&token=1e301c63-f353-43af-be08-e702f48f0259',
    steps: [
      'Stand tall, feet hip-width.',
      'Soft bend in knees, then hinge forward from the hip crease.',
      'Let the hands hang toward the floor, do not pull down.',
      'Hold 3 breaths, then roll up slowly, one vertebra at a time.'
    ],
    antiRotationNote: 'Watch for: lumbar rounding early in the movement. The fold should come from the hip joint.'
  },
  {
    id: 'sitting-slump',
    category: 'functional',
    name: 'Sitting Slump',
    purpose: 'Identify spinal flexibility and the neutral-spine position.',
    cue: 'Exaggerate the slump, then find the opposite, tall spine. Your ideal sitting posture is between these two.',
    animation: 'sittingSlump',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Sitting%20Slump.mp4?alt=media&token=068e2d7c-aef7-40d3-867c-23eecbb79780',
    steps: [
      'Sit on the edge of a chair, feet flat.',
      'Fully slump, round your lower back and drop your chest.',
      'Now over-arch, stick chest out and curve your lower back forward.',
      'Find the midpoint between the two: this is your neutral spine.'
    ],
    antiRotationNote: null
  },
  {
    id: 'hip-rotation',
    category: 'functional',
    name: 'Hip Internal / External Rotation',
    purpose: 'Assess hip mobility, the engine of healthy running.',
    cue: 'The hip rotates; the spine stays still. This is the core principle of the "Hip Engine."',
    animation: 'hipRotation',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Hip%20Internal%20%26%20External%20Rotation.mp4?alt=media&token=764b9905-2a40-4bd4-8ed1-47159d707cff',
    steps: [
      'Sit on the floor, legs straight in front.',
      'For internal rotation: let one leg fall inward, knee pointing in.',
      'For external rotation: let the same leg fall outward, knee pointing out.',
      'Compare left and right. Note any restriction.'
    ],
    antiRotationNote: 'The key insight: the lumbar spine must NOT rotate to compensate for limited hip mobility.'
  },
  {
    id: 'slr',
    category: 'functional',
    name: 'Supine Straight Leg Raise',
    purpose: 'Assess hamstring length and lumbar stability under hip flexion.',
    cue: 'The resting leg stays completely flat. If it lifts, the lumbar is compensating.',
    animation: 'slr',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Supine%20Straight%20Leg%20Raise.mp4?alt=media&token=57fb007d-dc91-44f1-8618-3b65cbcfb17a',
    steps: [
      'Lie on your back, both legs straight.',
      'Slowly raise one leg, keeping the knee locked.',
      'Note the angle at which you feel tension, this is your hamstring range.',
      'The other leg must remain flat on the floor throughout.'
    ],
    antiRotationNote: 'If the non-working leg lifts off the floor, the lumbar spine is rotating to compensate. Stop there.'
  },
  {
    id: 'prone-hip-extension',
    category: 'functional',
    name: 'Prone Hip Extension',
    purpose: 'Assess glute activation and lumbar stability.',
    cue: 'The glute fires to lift the leg; the lower back stays completely still.',
    animation: 'proneHipExtension',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Prone%20Hip%20Extension.mp4?alt=media&token=095ade52-86bd-43b9-b555-9b4d690a3da8',
    steps: [
      'Lie face down, legs straight, forehead resting on hands.',
      'Squeeze one glute and lift that leg a few inches off the floor.',
      'Hold 2 seconds, lower slowly.',
      'The lumbar spine and pelvis must not move at all.'
    ],
    antiRotationNote: 'Common fault: the lower back arches to compensate for weak glutes. If you feel this, reduce the range.'
  },
  {
    id: 'side-bend',
    category: 'functional',
    name: 'Side Bending & Rotation',
    purpose: 'Assess lateral and rotational mobility of the thoracic spine.',
    cue: 'The movement comes from the mid-back (thoracic), not the lumbar.',
    animation: 'sideBend',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Side%20Bending%20%26%20Rotation.mp4?alt=media&token=d6aa6ebc-07e9-4e48-8e72-6d17b4b535bb',
    steps: [
      'Stand tall, arms at sides.',
      'For side bend: slide one hand down toward your knee, keeping hips still.',
      'For rotation: cross arms over chest and turn slowly to look behind you.',
      'Compare left and right. Note any restriction or pull.'
    ],
    antiRotationNote: 'The hips stay square and still. All motion is above the pelvis.'
  },

  // STRENGTH TOOLS
  {
    id: 'deadlift',
    category: 'strength',
    name: 'Deadlift',
    cadence: '4s up · 2s hold · 4s down',
    purpose: 'Build posterior chain strength, the hip engine in its most powerful expression.',
    cue: 'Push the floor away from you. The bar travels in a straight line. The back never rounds.',
    animation: 'deadlift',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/DumbBell%20DeadLift%20WebApp%205.mp4?alt=media&token=5243f2c6-c3cc-417f-8a3b-6c14e82d209e',
    steps: [
      'Stand over the bar, feet hip-width, shins close to it.',
      'Hinge from the hips to grip the bar, back flat, chest proud.',
      'Take a big breath into your belly, brace your core (the bridge).',
      'Drive through the heels and push the floor away, 4 counts up.',
      'Hold for 2 counts at the top, then lower in 4 counts: hips back first, then knees bend.'
    ],
    antiRotationNote: 'The lumbar spine is the stable pillar. It does not round or rotate at any point in the lift.'
  },
  {
    id: 'suitcase-carry',
    category: 'strength',
    name: 'Suitcase Carry',
    cadence: 'Walk 20 steps each side',
    purpose: 'Train anti-lateral-flexion, core as the bridge under asymmetric load.',
    cue: 'Walk tall as if a thread is pulling the crown of your head up. Do NOT lean toward the weight.',
    animation: 'suitcaseCarry',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/DumbBell%20Suitcase%20Carry%20WebApp%209.mp4?alt=media&token=ce1e18e5-2d26-4d62-b7ae-2b4932b532fa',
    steps: [
      'Hold a kettlebell or dumbbell in one hand at your side.',
      'Stand tall, shoulder blades back and down, lumbar neutral.',
      'Walk 20 steps. Resist every urge to lean sideways.',
      'Switch hands and repeat.'
    ],
    antiRotationNote: 'The torso stays perfectly upright. Any lateral lean means the core has stopped bridging.'
  },
  {
    id: 'clean-to-press',
    category: 'strength',
    name: 'Clean to Press',
    cadence: '4s press · 2s hold · 4s lower',
    purpose: 'Integrate hip power with shoulder stability, the full kinetic chain.',
    cue: 'The power comes from the hip snap, not the arms. The press is a shoulder movement, the lumbar does not arch.',
    animation: 'cleanToPress',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/DumbBell%20Clean%20to%20Press%20WebApp%208.mp4?alt=media&token=2245258b-1399-4e59-ae18-26df6c0a83ea',
    steps: [
      'Start with kettlebell at hip level, hinge slightly.',
      'Drive hips forward explosively, this momentum brings the bell to rack position (shoulder).',
      'Pause. Set the core (the bridge).',
      'Press overhead in 4 counts, do not arch the lower back.',
      'Hold for 2 counts at the top, then lower in 4 counts back to rack, then to start.'
    ],
    antiRotationNote: 'During the press: if the lower back arches, the core has disengaged. Reduce weight.'
  },
  {
    id: 'bench-press',
    category: 'strength',
    name: 'Bench Press',
    cadence: '4s down · 2s hold · 4s up',
    purpose: 'Upper-body push strength with a stable, grounded base.',
    cue: 'Press the floor with your feet. The upper back stays pinned to the bench. No excessive arch.',
    animation: 'benchPress',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/DumbBell%20BenchPress%20WebApp%202.mp4?alt=media&token=322b4946-36d8-4225-8b03-8c0d6034017e',
    steps: [
      'Lie on the bench, feet flat on the floor.',
      'Retract shoulder blades, they are pinned to the bench.',
      'Lower the bar in 4 counts to mid-chest.',
      'Hold for 2 counts, then press back up in 4 counts, drive the floor with your feet.'
    ],
    antiRotationNote: 'A natural arch is fine; excessive lumbar arch to gain range is a compensation.'
  },
  {
    id: 'bent-over-row',
    category: 'strength',
    name: 'Bent Over Row',
    cadence: '4s pull · 2s hold · 4s lower',
    purpose: 'Upper-back pulling strength while maintaining the hip-hinge.',
    cue: 'You are in a hinge, the same position as a deadlift. The back is flat. Pull with your elbows, not your hands.',
    animation: 'bentOverRow',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/DumbBell%20Row%20WebApp%203.mp4?alt=media&token=a2c8d0d0-cd1c-49b9-b27b-4eb623f1f706',
    steps: [
      'Hinge forward until torso is roughly parallel to the floor, back flat.',
      'Let the barbell hang at arm\'s length.',
      'Pull the bar to your lower ribcage in 4 counts, squeeze shoulder blades.',
      'Hold for 2 counts, then lower in 4 counts. The torso does not move throughout.'
    ],
    antiRotationNote: 'The lumbar spine must not rotate or flex/extend during the pull.'
  },
  {
    id: 'farmers-carry',
    category: 'strength',
    name: "Farmer's Carry",
    cadence: 'Walk 20 steps',
    purpose: 'Total-body stability under bilateral load.',
    cue: 'Walk tall, like the Puppet. Two weights pulling you down, your spine resists by growing taller.',
    animation: 'farmersCarry',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/DumbBell%20Farmers%20Walk%20WebApp%204.mp4?alt=media&token=35984225-a3e7-41ca-a5d7-0b77dc2bbd59',
    steps: [
      'Hold a weight in each hand, standing tall.',
      'Shoulders back and down, lumbar neutral.',
      'Walk 20 steps with purpose, controlled, upright.',
      'Do not let the shoulders creep up to the ears.'
    ],
    antiRotationNote: 'The spine grows taller with each step. Shoulders and hips stay level.'
  },
  {
    id: 'reverse-lunge',
    category: 'strength',
    name: 'Reverse Lunge',
    cadence: '4s down · 2s hold · 4s up',
    purpose: 'Single-leg hip strength with frontal-plane stability.',
    cue: 'The front knee tracks over the second toe. The torso stays vertical, do not lean forward.',
    animation: 'reverseLunge',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Reverse%20Lunge.mp4?alt=media&token=b0791537-09e9-47c3-b1f1-aab87c2d999b',
    steps: [
      'Stand tall, feet together.',
      'Step one foot back and lower in 4 counts until back knee nearly touches the floor.',
      'The front shin stays vertical, weight through the front heel.',
      'Hold for 2 counts, then drive through the front heel to rise in 4 counts.'
    ],
    antiRotationNote: 'The torso stays upright throughout. Any forward lean shifts load to the knee.'
  },
  {
    id: 'overhead-press',
    category: 'strength',
    name: 'Overhead Press',
    cadence: '4s up · 2s hold · 4s down',
    purpose: 'Shoulder strength with the lumbar as the stable pillar.',
    cue: 'Before you press, brace your core. The ribs stay down, do not let them flare.',
    animation: 'overheadPress',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/DumbBell%20Overhead%20Press%20App%207.mp4?alt=media&token=9ef1e232-fdd3-4b7e-8c66-659d0f2b0730',
    steps: [
      'Stand tall, bar at shoulder height, elbows in front.',
      'Take a breath, brace the core (the bridge).',
      'Press the bar overhead in 4 counts, the bar passes the face, then the ears.',
      'At the top: biceps by ears, everything stacked. Hold for 2 counts.',
      'Lower in 4 counts back to shoulders.'
    ],
    antiRotationNote: 'If the lower back arches and the ribs flare during the press, the core bridge has failed. Reset.'
  },
  {
    id: 'bicep-curl',
    category: 'strength',
    name: 'Bicep Curl',
    cadence: '4s up · 2s hold · 4s down',
    purpose: 'Elbow flexor strength with strict technique, no momentum.',
    cue: 'The elbows stay pinned at your sides. The only thing moving is the forearm.',
    animation: 'bicepCurl',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/DumbBell%20Biceps%20Curl%20WebApp%206.mp4?alt=media&token=8dc69dc0-795f-41e4-abbb-b52b6407aab9',
    steps: [
      'Stand tall, dumbbells at your sides, palms facing forward.',
      'Curl in 4 counts, elbows stay against your torso.',
      'Hold and squeeze at the top for 2 counts.',
      'Lower in 4 counts, resist the weight all the way down.'
    ],
    antiRotationNote: 'No swinging, no lumbar extension to initiate the curl. Control over momentum.'
  },
  {
    id: 'squat-strength',
    category: 'strength',
    name: 'Squat (Strength)',
    cadence: '4s down · 2s hold · 4s up',
    purpose: 'Build lower-body strength with the hip as the primary engine.',
    cue: 'Sit back into the squat, your hips reach behind your heels. The knees follow the hips, not the other way around.',
    animation: 'squat',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/DumbBell%20Squats%20WebApp%201.mp4?alt=media&token=f14fc920-a107-4b2a-a616-c08938d390da',
    steps: [
      'Bar across upper back, feet shoulder-width.',
      'Sit back and down in 4 counts, hips back first, then knees track out.',
      'Keep chest tall, lumbar neutral.',
      'Hold for 2 counts at the bottom, then drive through heels to rise in 4 counts.'
    ],
    antiRotationNote: 'The lumbar spine is the stable pillar from start to finish.'
  },

  // MOBILITY
  {
    id: 'cat-camel',
    category: 'functional',
    name: 'Cat Camel',
    purpose: 'Restore fluid motion through the full spine, from tailbone to skull.',
    cue: 'Move slowly and with control. The spine is a wave, not a hinge.',
    animation: 'default',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Cat%20Camel%20WebApp.mp4?alt=media&token=bec83c50-6b74-4fba-920f-05fd0f4452fa',
    steps: [
      'Begin on all fours, wrists under shoulders, knees under hips.',
      'Inhale: let the belly drop toward the floor, lift the tailbone and head (Camel).',
      'Exhale: round the spine toward the ceiling, tuck the tailbone and chin (Cat).',
      'Move through the full range slowly, 8 to 10 breath cycles.'
    ],
    antiRotationNote: null
  },
  {
    id: 'arm-rotation',
    category: 'functional',
    name: 'Arm Rotation',
    purpose: 'Open the thoracic spine and shoulder girdle, the foundation of upper-body freedom.',
    cue: 'The rotation comes from the mid-back. The lower back stays still.',
    animation: 'default',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Arm%20Rotation%20WebApp.mp4?alt=media&token=a2ef0fd2-1a63-4e0d-b053-9b8ac2e9573e',
    steps: [
      'Stand tall, arms extended out to the side at shoulder height.',
      'Slowly rotate both arms in large circles, forward 5 times, then backward 5 times.',
      'Keep the spine tall throughout, no leaning.',
      'Breathe out on each rotation.'
    ],
    antiRotationNote: null
  },
  {
    id: 'orange-squeeze',
    category: 'functional',
    name: 'Orange Squeeze',
    purpose: 'Activate the hands without gripping, release tension that travels up the arm into the neck and shoulders.',
    cue: 'Imagine holding a ripe orange. Squeeze just enough to feel it, never enough to crush it.',
    animation: 'default',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Orange%20Squeeze%20WebApp.mp4?alt=media&token=b75ed566-013c-4eb1-9aee-6c09aa117465',
    steps: [
      'Stand or sit tall, arms relaxed at your sides.',
      'Imagine an orange in each hand, soft and ripe.',
      'Squeeze gently for 2 seconds, then release fully for 2 seconds.',
      'Repeat 8–10 times. Feel the tension drop from forearms, shoulders, and jaw.'
    ],
    antiRotationNote: 'A clenched fist locks the shoulder and neck. Soft hands keep the upper body free.'
  },

  // RUNNING DRILLS
  {
    id: 'hopping',
    category: 'running',
    name: 'Hopping Drill',
    purpose: 'Teach the soft landing, absorb impact through the hip, not the knee.',
    cue: 'Land like you\'re landing on thin ice. Quiet feet. The sound of your landing tells you everything.',
    animation: 'hopping',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Hopping.mp4?alt=media&token=2bff169b-03ef-4332-817d-a9facb372f3e',
    steps: [
      'Stand on one foot.',
      'Hop forward a few inches and land softly, bend the knee and hip together on contact.',
      'Think: "quiet landing." Your landing should make no sound.',
      'Alternate feet. Focus on the elastic absorption at the hip.'
    ],
    antiRotationNote: null
  },
  {
    id: 'spot-jogging',
    category: 'running',
    name: 'Spot Jogging',
    purpose: 'Find the tall running posture and feel the hip drive without forward movement.',
    cue: 'Run tall. You are a Puppet, a string from the crown of your head pulling you upward. Feel the hip flexors driving the knees forward.',
    animation: 'spotJogging',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Spot%20Jog%20WebApp.mp4?alt=media&token=4cdac2bd-599b-4a1a-83e9-5518f6b0bab7',
    steps: [
      'Jog on the spot at an easy pace.',
      'Feel the string at the crown of your head, grow tall with each step.',
      'Drive the knee forward from the hip, not from the foot.',
      'Land under your centre of mass, not in front of it.'
    ],
    antiRotationNote: null
  },
  {
    id: 'skipping',
    category: 'running',
    name: 'Skipping Drill',
    purpose: 'Reinforce the elastic, hip-driven landing pattern at a higher amplitude.',
    cue: 'The arm swing drives the hip. Opposite arm, opposite hip. The core is the bridge between them.',
    animation: 'skipping',
    video: 'https://firebasestorage.googleapis.com/v0/b/gentle-badass.firebasestorage.app/o/Skipping.mp4?alt=media&token=fd829bee-e206-43a8-b0ef-f35ce18528fa',
    steps: [
      'Skip forward with exaggerated arm swing.',
      'On each skip, feel the opposite arm and hip working together.',
      'Land softly and spring, not thump and bounce.',
      'Keep the spine tall throughout, the Puppet cue applies here too.'
    ],
    antiRotationNote: null
  }
]

export const CATEGORIES = {
  functional: { label: 'Functional Tests', color: '#8b9e7e', description: 'Assess your baseline, where you are today.' },
  strength: { label: 'Strength', color: '#9e8b7e', description: 'Build the engine. 10-second cadence: control over momentum.' },
  running: { label: 'Mobility', color: '#7e8b9e', description: 'Learn the soft landing and the hip engine.' }
}
