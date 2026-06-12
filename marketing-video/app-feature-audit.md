# App Feature Audit

Generated for the promotional video from the live app and local codebase.

## Source of Truth

- Live app: `https://laultrarunandbee.web.app/`
- Codebase: React/Vite app in `src/`
- Current date: 2026-06-12

## Real Public Pages and Routes

- `/`: Home dashboard with app name, daily greeting, free-access notice, app explanation, Today's Feel card, journey stats, plan/breathing/function/progress cards, recent Feel placeholder, daily intention, theme picker, bottom navigation, and floating chat entry.
- `/messages`: Route exists in code, but unauthenticated access is covered by the sign-in gate.
- `/profile`: Route exists in code, but unauthenticated access is covered by the sign-in gate.

## Real Auth and Entry Flows

- Google sign-in exists through Firebase Auth.
- Guest mode exists through a first-name field in the sign-in gate.
- Guest mode saves on the current device only.
- The home screen remains visible behind the sign-in gate before a visitor signs in or enters guest mode.

## Real User Features in Code

- Daily Feel check-in with body, mind, and movement factors.
- Optional reflection notes.
- Optional cycle context and cycle-sync controls for applicable profiles.
- Breathe module with a guided 5 BPM breathing practice, timer, phase cues, session logging, and reminder settings.
- Your Plan area with Breathe, Running, Strength, and Coach tabs.
- Exercise library/detail pages for movement modules.
- Functional Tests route.
- Progress/History route with Feel and workout history.
- Messages route with coach chat and announcements for signed-in users.
- Coach route and embedded Coach planner for training plans and check-ins.
- Onboarding flow for signed-in users whose profile is incomplete.
- Paywall route exists in code.

## Real Admin Features in Code

Admin access is controlled by configured admin emails and a Firestore `admins` collection. When a signed-in user is an admin, code supports:

- Admin dashboard view.
- All-user profile and journal visibility.
- User deletion/tombstone flow.
- Profile editing.
- User coach-plan review and editing.
- Workout generation for plan weeks.
- Admin remarks.
- User message threads and unread counts.
- Announcements posting and deletion.
- Activity log viewing.
- Theme switching for the current UI.

## Limitations for This Render

- No admin credentials or authenticated admin browser state were available.
- The app uses Google sign-in, not an email/password login form, so `ADMIN_EMAIL` and `ADMIN_PASSWORD` alone are not enough to automate admin capture.
- No private user data was captured.
- Admin footage is omitted from the final video rather than faked.
- Higgsfield was not used; the video is built from real app captures and Remotion motion design.
