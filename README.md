# Bible Unlock

A phone lock app: after you unlock your phone, a Bible verse appears, and you only get in by **reading it aloud** (speech recognition) or **listening to it** (text-to-speech). Verses go through the Bible in order, from Genesis 1:1 to Revelation 22:21, using the World English Bible (public domain).

Built with React Native + Expo. Android comes first; iOS will follow as an app plus a lock-screen widget.

## Status

| Step | What | State |
|---|---|---|
| 1 | Verse screen: Read aloud / Listen, saves your place in the Bible | ✅ Done |
| 2 | Android lock: verse appears over the lock screen, 15-min cooldown, skips, Emergency, never blocks calls | ✅ Built, testing on phones |
| 3 | Supabase: Google login, streaks, stats | Planned |
| 4 | Google Play release prep | Planned |
| 5 | iOS app + verse widget | Planned |

## Prerequisites (macOS)

1. **Node.js** 20.19 or newer. LTS releases (22 or 24) are the safest.
2. **Android Studio**. Open it once and finish the setup wizard so the Android SDK and an emulator get installed.
3. **JDK 17**. Android Studio's bundled JDK (25) breaks React Native builds (see Troubleshooting).
   ```bash
   brew install --cask zulu@17
   ```
4. Add the following to `~/.zshrc`, then open a new terminal:
   ```bash
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
   ```
   Check it worked: `java -version` should print 17, and `adb version` should print a version.

## Run on Android

```bash
npm install
npx expo run:android
```

The first build takes 5–10 minutes. Later builds are much faster. This command:
1. generates the native `android/` folder from `app.json`,
2. builds and installs the app on the connected phone or a running emulator,
3. starts Metro, the JavaScript server that pushes your code changes to the app.

### On a real phone (recommended, because Read aloud needs a real microphone)

1. On the phone, go to **Settings → About phone** and tap **Build number** 7 times to unlock Developer options.
2. Go to **Settings → System → Developer options** and turn on **USB debugging**.
3. Plug the phone in and accept the "Allow USB debugging?" prompt.
4. Run `adb devices`. Your phone should be listed. Then run `npx expo run:android`.

If more than one device is connected, pick one with `npx expo run:android --device`.

### On the emulator

Start it from Android Studio's **Device Manager**, or run:
```bash
emulator -list-avds
emulator -avd <name>
```
Then run `npx expo run:android`.

Read aloud only works on the emulator if you pass your Mac's microphone through: open the emulator's **⋯ (Extended controls) → Microphone** and turn on **Virtual microphone uses host audio input**.

## Build an installable APK (no Metro needed)

```bash
cd android && ./gradlew app:assembleRelease -PreactNativeArchitectures=arm64-v8a && cd ..
mkdir -p dist && cp android/app/build/outputs/apk/release/app-release.apk dist/bible-unlock.apk
```

Install it over USB with `adb install dist/bible-unlock.apk`, or copy the file to the phone and open it there. You'll need to allow "Install unknown apps" for whichever app you open it with.

This APK is signed with the debug key, so it's for testing only. A Play Store build needs its own upload key (that's step 4).

## Day-to-day development

| You changed… | Do this |
|---|---|
| JS/TS (`App.tsx`, `src/`) | Nothing. The app reloads automatically. Press `r` in the Metro terminal to force a reload. |
| Kotlin (`modules/gate/android/`), `app.json`, or added a package with native code | Run `npx expo run:android` again. |
| Native build behaves strangely | Run `npx expo prebuild --clean`, then `npx expo run:android`. |

Install packages with `npx expo install <pkg>`, not `npm install`. That way you get versions that match this Expo SDK.

Never edit `android/` by hand. It is generated, and it is git-ignored.

## Checks

```bash
npx tsc --noEmit               # typecheck
node scripts/check-match.mts   # read-aloud matching logic
```

## Rebuilding the Bible text

The app ships `modules/gate/android/src/main/assets/bible-web.txt`, one verse per line in the form `Genesis 1:1|text`. You only need to regenerate it if you change translations or eBible.org publishes an update:

```bash
curl -LO https://ebible.org/Scriptures/engwebp_vpl.zip
unzip engwebp_vpl.zip -d web
node scripts/build-bible.mjs web/engwebp_vpl.txt
```

## Project layout

```
App.tsx                  Verse screen (Read aloud / Listen)
src/match.ts             Compares spoken words with the verse (tolerates misheard words)
modules/gate/            Native Android module (Kotlin): verse lookup; the lock lives here next
  android/src/main/assets/bible-web.txt   World English Bible, 31,098 verses
scripts/build-bible.mjs  Converts eBible.org's VPL file into bible-web.txt
scripts/check-match.mts  Self-check for src/match.ts
app.json                 App name, package (com.bibleunlock.app), permissions via plugins
```

## Troubleshooting

| Error | Fix |
|---|---|
| `configureCMakeDebug … A restricted method in java.lang.System has been called` | The build is running on JDK 25. Set `JAVA_HOME` to JDK 17 (see Prerequisites). |
| `SDK location not found` | `ANDROID_HOME` isn't set. See Prerequisites step 4. |
| `No Android connected device found` | Start an emulator or plug in your phone, then check `adb devices`. |
| App shows "Unable to load script" | Metro isn't running. Start it with `npx expo start`, then reopen the app. |
| Read aloud says "Didn't catch that" every time | On the emulator, turn on the host microphone (see above). On a phone, check that the Google app is installed and up to date. |
