import { ExpoSpeechRecognitionModule as Rec } from 'expo-speech-recognition';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Gate from './modules/gate';
import { store } from './src/store';
import { Btn, C } from './src/ui';

/** Setup and settings. The verse itself lives in src/GateScreen.tsx. */
export default function App() {
  const [st, setSt] = useState(Gate.status());
  const [mic, setMic] = useState(false);
  const [skips, setSkips] = useState(3);
  const [next, setNext] = useState('');

  const refresh = async () => {
    setSt(Gate.status());
    setMic((await Rec.getPermissionsAsync()).granted);
    setSkips(await store.skipsPerDay());
    setNext((await Gate.verse(await store.verseIndex()))?.[0] ?? 'Genesis 1:1');
  };
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh()); // back from Settings
    return () => sub.remove();
  }, []);

  const askMic = async () => {
    const r = await Rec.requestPermissionsAsync();
    if (!r.granted && !r.canAskAgain) Gate.openAppSettings(); // denied for good: only Settings can fix it
    refresh();
  };

  const changeSkips = (n: number) => {
    const v = Math.min(10, Math.max(0, n));
    setSkips(v);
    store.setSkipsPerDay(v);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.body}>
      <StatusBar style="light" />
      <Text style={s.title}>Bible Unlock</Text>
      <Text style={s.sub}>A verse before your phone.</Text>

      <Text style={s.section}>SETUP</Text>
      <Step ok={st.overlay} label="Display over other apps" hint="Lets the verse appear when you turn on your phone" onFix={Gate.openOverlaySettings} />
      <Step ok={mic} label="Microphone" hint="Checks that you read the verse aloud" onFix={askMic} />
      <Step ok={st.battery} label="Battery: Unrestricted" hint="App info → Battery → Unrestricted, so your phone doesn't stop the lock" onFix={Gate.openAppSettings} />

      <Text style={s.section}>LOCK</Text>
      <View style={s.card}>
        <View style={s.grow}>
          <Text style={s.label}>Verse lock</Text>
          <Text style={s.hint}>{st.overlay ? 'Shows a verse at most every 15 minutes' : 'Allow "Display over other apps" first'}</Text>
        </View>
        <Switch
          value={st.enabled}
          disabled={!st.overlay}
          onValueChange={(on) => {
            Gate.setEnabled(on);
            refresh();
          }}
          trackColor={{ true: C.gold, false: C.line }}
          thumbColor={C.text}
        />
      </View>
      <View style={s.card}>
        <View style={s.grow}>
          <Text style={s.label}>Skips per day</Text>
          <Text style={s.hint}>For when you can't read or listen</Text>
        </View>
        <Stepper value={skips} onChange={changeSkips} />
      </View>

      <Text style={s.section}>NEXT VERSE</Text>
      <Text style={s.next}>{next}</Text>
      <View style={s.row}>
        <Btn primary label="Try it now" onPress={Gate.open} />
      </View>
    </ScrollView>
  );
}

function Step(p: { ok: boolean; label: string; hint: string; onFix: () => void }) {
  return (
    <View style={s.card}>
      <Text style={[s.check, p.ok && { color: C.gold }]}>{p.ok ? '✓' : '○'}</Text>
      <View style={s.grow}>
        <Text style={s.label}>{p.label}</Text>
        <Text style={s.hint}>{p.hint}</Text>
      </View>
      {!p.ok && (
        <Pressable accessibilityRole="button" onPress={() => p.onFix()} style={s.allow}>
          <Text style={s.allowText}>Allow</Text>
        </Pressable>
      )}
    </View>
  );
}

function Stepper(p: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={s.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fewer skips" onPress={() => p.onChange(p.value - 1)} hitSlop={8}>
        <Text style={s.stepBtn}>−</Text>
      </Pressable>
      <Text style={s.label}>{p.value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="More skips" onPress={() => p.onChange(p.value + 1)} hitSlop={8}>
        <Text style={s.stepBtn}>+</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { paddingHorizontal: 24, paddingTop: 72, paddingBottom: 48 },
  title: { color: C.text, fontFamily: 'serif', fontSize: 34 },
  sub: { color: C.dim, fontSize: 16, marginTop: 6 },
  section: { color: C.gold, fontSize: 12, letterSpacing: 2.5, marginTop: 36, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10 },
  grow: { flex: 1 },
  check: { color: C.dim, fontSize: 18, width: 20, textAlign: 'center' },
  label: { color: C.text, fontSize: 16, fontWeight: '600' },
  hint: { color: C.dim, fontSize: 13, marginTop: 3 },
  allow: { backgroundColor: C.gold, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 16 },
  allowText: { color: C.bg, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  stepBtn: { color: C.gold, fontSize: 24, width: 24, textAlign: 'center' },
  next: { color: C.text, fontFamily: 'serif', fontSize: 22, marginBottom: 20 },
  row: { flexDirection: 'row' },
});
