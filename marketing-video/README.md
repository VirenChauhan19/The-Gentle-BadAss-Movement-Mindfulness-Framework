# La Ultra Run & Bee Promo Video

This folder contains a reproducible Remotion video pipeline for a 1920x1080 promotional/explainer video using the real deployed app UI at `https://laultrarunandbee.web.app/`.

## Setup

Copy `.env.example` to `.env` if you need to override defaults:

```bash
cp marketing-video/.env.example marketing-video/.env
```

The default public app URL is already configured. Real secrets should stay in `marketing-video/.env`, not in git.

## Commands

```bash
npm run video:audit
npm run video:capture
npm run video:render
npm run video:all
```

The final MP4 is written to:

```text
marketing-video/output/la-ultra-run-and-bee-promo.mp4
```

## Environment Variables

- `APP_URL`: deployed app URL. Defaults to `https://laultrarunandbee.web.app/`.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: reserved for admin capture. The current app uses Google sign-in, so email/password automation is not available unless the app adds that flow or a pre-authenticated browser state is provided.
- `USER_EMAIL` / `USER_PASSWORD`: reserved for future member capture. Not used by the current Google-only auth flow.
- `USE_HIGGSFIELD`: optional. Default is `false`; this render does not require Higgsfield.
- `VOICE_PROVIDER`, `ELEVENLABS_API_KEY`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`: reserved for high-quality voice generation.

## Current Limitations

No admin credentials or automatable admin session were available during this render. Admin footage is therefore omitted instead of simulated. The video uses real public and guest-access app screens only.

No ElevenLabs or Azure voice key was available. The video includes polished captions, a written voiceover script, and a soft generated music bed rather than a low-quality synthetic narrator.

## Workflow

1. `video:audit` writes `app-feature-audit.md` from the codebase and live-app constraints.
2. `video:capture` opens the live app with Playwright, captures the sign-in gate and guest/home experience, and saves PNGs under `captures/`.
3. `video:render` renders the Remotion composition to MP4.
