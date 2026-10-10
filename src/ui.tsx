import { Pressable, StyleSheet, Text } from 'react-native';

export const C = { bg: '#0E0D0B', card: '#1A1814', text: '#F3EDE2', dim: '#5E5A53', gold: '#C9A45C', line: '#2E2B26' };

export function Btn(p: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => p.onPress()} // don't forward the press event: native functions reject extra arguments
      disabled={p.disabled}
      style={[s.btn, p.primary && s.primary, p.disabled && { opacity: 0.4 }]}>
      <Text style={[s.text, p.primary && { color: C.bg }]}>{p.label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { flex: 1, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 28, borderWidth: 1, borderColor: C.line, alignItems: 'center' },
  primary: { backgroundColor: C.gold, borderColor: C.gold },
  text: { color: C.text, fontSize: 16, fontWeight: '600' },
});
