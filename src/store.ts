import AsyncStorage from '@react-native-async-storage/async-storage';

const today = () => new Date().toDateString(); // local calendar day

export const store = {
  verseIndex: async () => Number(await AsyncStorage.getItem('verseIndex')) || 0,
  setVerseIndex: (i: number) => AsyncStorage.setItem('verseIndex', String(i)),

  skipsPerDay: async () => Number((await AsyncStorage.getItem('skipsPerDay')) ?? 3),
  setSkipsPerDay: (n: number) => AsyncStorage.setItem('skipsPerDay', String(n)),

  async skipsUsedToday(): Promise<number> {
    const used = JSON.parse((await AsyncStorage.getItem('skipsUsed')) ?? 'null');
    return used?.day === today() ? used.n : 0;
  },
  async useSkip() {
    const n = await store.skipsUsedToday();
    await AsyncStorage.setItem('skipsUsed', JSON.stringify({ day: today(), n: n + 1 }));
  },
};
