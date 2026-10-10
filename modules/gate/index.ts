import { requireNativeModule } from 'expo';

export default requireNativeModule<{
  /** [ref, text] of the verse at this position in the Bible, or null past Revelation 22:21. */
  verse(index: number): Promise<[string, string] | null>;
  /** Lock on/off, "Display over other apps" granted, battery set to Unrestricted. */
  status(): { enabled: boolean; overlay: boolean; battery: boolean };
  setEnabled(on: boolean): void;
  openOverlaySettings(): void;
  openAppSettings(): void;
  /** Show the verse screen now. */
  open(): void;
  /** From the verse screen: start the 15-min cooldown, ask for the PIN, close. `dialer` opens the phone dialer after. */
  unlock(dialer: boolean): Promise<void>;
}>('Gate');
