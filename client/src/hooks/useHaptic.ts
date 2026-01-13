import { useCallback } from "react";

type HapticStyle = "light" | "medium" | "heavy" | "selection";

/**
 * Hook for haptic feedback on mobile devices
 * Uses Vibration API with fallback for unsupported devices
 */
export function useHaptic() {
  const triggerHaptic = useCallback((style: HapticStyle = "light") => {
    // Check if device supports vibration
    if (!("vibrate" in navigator)) {
      return;
    }

    // Map haptic styles to vibration patterns (in milliseconds)
    const patterns: Record<HapticStyle, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      selection: [5, 10], // Short pulse followed by pause
    };

    try {
      navigator.vibrate(patterns[style]);
    } catch (error) {
      // Silently fail if vibration is not supported or blocked
      console.debug("Haptic feedback not available:", error);
    }
  }, []);

  return { triggerHaptic };
}
