import { Alert } from 'react-native';

// Iran: Tapsell/Adivery adapters implement this (milestone 7). Callers never touch an SDK directly.
export interface AdProvider {
  showInterstitial(): Promise<void>;
  /** Resolves true only if the user watched to the end and earned the reward. */
  showRewarded(): Promise<boolean>;
}

const mockAds: AdProvider = {
  async showInterstitial() {
    await new Promise<void>((resolve) => Alert.alert('تبلیغ آزمایشی', 'اینجا تبلیغ میان‌صفحه‌ای نمایش داده می‌شود.', [{ text: 'بستن', onPress: () => resolve() }]));
  },
  async showRewarded() {
    return new Promise<boolean>((resolve) =>
      Alert.alert('تبلیغ جایزه‌دار آزمایشی', 'تبلیغ را تا آخر تماشا کردی؟', [
        { text: 'نه', style: 'cancel', onPress: () => resolve(false) },
        { text: 'بله، جایزه بده', onPress: () => resolve(true) },
      ]),
    );
  },
};

export const ads: AdProvider = mockAds;
