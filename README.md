<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c26e8235-9bfa-4601-8349-b8704050f3c1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `NEXT_PUBLIC_GEMINI_API_KEY` and `NEXT_PUBLIC_FIREBASE_API_KEY_B64` in [.env.local](.env.local) (`NEXT_PUBLIC_FIREBASE_API_KEY_B64` should be the Base64-encoded Firebase API key from Firebase project settings → General → Your apps)
3. Run the app:
   `npm run dev`
