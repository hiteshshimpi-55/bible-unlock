import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule as Rec, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Gate from '../modules/gate';
import { score, words } from './match';
import { store } from './store';
import { Btn, C } from './ui';

type Mode = 'idle' | 'reading' | 'listening' | 'done';

/** The verse lock, shown by GateActivity on top of the lock screen or after unlock. */
export default function GateScreen() {
  const [index, setIndex] = useState<number | null>(null);
  const [verse, setVerse] = useState<[string, string] | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [heard, setHeard] = useState(''); // final transcript segments so far
  const [interim, setInterim] = useState('');
  const [msg, setMsg] = useState('');
  const [skipsLeft, setSkipsLeft] = useState(0);

  const stopAll = () => {
    Rec.abort();
    Speech.stop();
  };

  useEffect(() => {
    store.verseIndex().then(setIndex);
    Promise.all([store.skipsPerDay(), store.skipsUsedToday()]).then(([per, used]) => setSkipsLeft(Math.max(0, per - used)));
    const back = BackHandler.addEventListener('hardwareBackPress', () => true); // no way out but through
    const app = AppState.addEventListener('change', (s) => s !== 'active' && stopAll()); // never record in the background
    return () => {
      back.remove();
      app.remove();
    };
  }, []);
  useEffect(() => {
    if (index !== null) Gate.verse(index).then((v) => (v ? setVerse(v) : setIndex(0))); // past Revelation 22:21 → start over
  }, [index]);

  const display = verse ? verse[1].split(/\s+/) : [];
  const tokens = display.map(words);
  const flat = tokens.flat();
  const { pos, passed } = score(flat, words(`${heard} ${interim}`));

  const finish = () => {
    setMode('done');
    setTimeout(async () => {
      await store.setVerseIndex(index! + 1);
      Gate.unlock(false);
    }, 1200);
  };

  useEffect(() => {
    if (mode === 'reading' && passed) {
      Rec.abort();
      finish();
    }
  }, [mode, passed]);

  useSpeechRecognitionEvent('result', (e) => {
    const t = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      setHeard((h) => `${h} ${t}`);
      setInterim('');
    } else setInterim(t);
  });
  useSpeechRecognitionEvent('end', () => setMode((m) => (m === 'reading' ? 'idle' : m)));
  useSpeechRecognitionEvent('error', (e) => {
    if (e.error === 'aborted') return;
    setMsg(e.error === 'no-speech' ? "Didn't catch that. Tap Read aloud to try again." : e.message);
  });

  const read = async () => {
    if (mode === 'reading') return Rec.stop();
    const { granted } = await Rec.requestPermissionsAsync();
    if (!granted) return setMsg('Allow the microphone in Bible Unlock to read aloud, or tap Listen.');
    setMsg('');
    setMode('reading');
    Rec.start({ lang: 'en-US', interimResults: true, continuous: true, contextualStrings: [...new Set(flat)] });
  };

  const listen = () => {
    if (mode === 'listening') return void Speech.stop();
    setMsg('');
    setMode('listening');
    Speech.speak(`${verse![0]}. ${verse![1]}`, {
      language: 'en-US',
      onDone: finish,
      onStopped: () => setMode('idle'),
      onError: () => setMode('idle'),
    });
  };

  const skip = async () => {
    stopAll();
    await store.useSkip();
    Gate.unlock(false);
  };

  const emergency = () => {
    stopAll();
    Gate.unlock(true);
  };

  if (!verse) return <View style={s.screen} />;

  const tracking = mode === 'reading' || heard !== '';
  let seen = 0;
  const status =
    msg ||
    {
      idle: tracking ? 'Tap Read aloud to continue' : 'Read it aloud or listen to unlock',
      reading: 'Listening… keep reading',
      listening: 'Playing…',
      done: 'Amen ✓',
    }[mode];
  const busy = mode !== 'idle';

  return (
    <View style={s.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.ref}>{verse[0].toUpperCase()}</Text>
        <Text style={s.verse}>
          {display.map((w, i) => {
            seen += tokens[i].length;
            const lit = !tracking || mode === 'done' || seen <= pos;
            return (
              <Text key={i} style={lit ? undefined : s.dim}>
                {w}{' '}
              </Text>
            );
          })}
        </Text>
      </ScrollView>
      <Text style={s.status}>{status}</Text>
      <View style={s.row}>
        <Btn primary label={mode === 'reading' ? 'Stop' : '🎤  Read aloud'} onPress={read} disabled={mode === 'listening' || mode === 'done'} />
        <Btn label={mode === 'listening' ? 'Stop' : '🔊  Listen'} onPress={listen} disabled={mode === 'reading' || mode === 'done'} />
      </View>
      <View style={[s.row, s.small]}>
        {skipsLeft > 0 ? <Link label={`Skip · ${skipsLeft} left today`} onPress={skip} disabled={busy} /> : <View />}
        <Link label="Emergency" onPress={emergency} />
      </View>
    </View>
  );
}

function Link(p: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={() => p.onPress()} disabled={p.disabled} hitSlop={12}>
      <Text style={[s.link, p.disabled && { opacity: 0.4 }]}>{p.label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 28, paddingTop: 72, paddingBottom: 40 },
  body: { flexGrow: 1, justifyContent: 'center' },
  ref: { color: C.gold, fontSize: 13, letterSpacing: 2.5, marginBottom: 20 },
  verse: { color: C.text, fontFamily: 'serif', fontSize: 26, lineHeight: 40 },
  dim: { color: C.dim },
  status: { color: C.dim, fontSize: 14, textAlign: 'center', marginVertical: 20 },
  row: { flexDirection: 'row', gap: 12 },
  small: { justifyContent: 'space-between', marginTop: 24, paddingHorizontal: 8 },
  link: { color: C.dim, fontSize: 14 },
});
