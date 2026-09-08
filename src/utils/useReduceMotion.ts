import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the system "Reduce Motion" setting is on. Defaults to false until known. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (!cancelled) setReduce(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
  return reduce;
}
