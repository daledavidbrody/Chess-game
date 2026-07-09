import { useCallback, useEffect, useRef, useState } from 'react';

export function useChessClock({ baseMs, incrementMs, unlimited, activeColor, running, onFlag }) {
  const [whiteMs, setWhiteMs] = useState(baseMs);
  const [blackMs, setBlackMs] = useState(baseMs);
  const lastTickRef = useRef(null);
  const onFlagRef = useRef(onFlag);

  useEffect(() => {
    onFlagRef.current = onFlag;
  }, [onFlag]);

  const reset = useCallback(() => {
    setWhiteMs(baseMs);
    setBlackMs(baseMs);
    lastTickRef.current = null;
  }, [baseMs]);

  const addIncrement = useCallback(
    (color) => {
      if (unlimited || incrementMs <= 0) return;
      if (color === 'w') {
        setWhiteMs((ms) => ms + incrementMs);
      } else {
        setBlackMs((ms) => ms + incrementMs);
      }
    },
    [incrementMs, unlimited]
  );

  useEffect(() => {
    if (!running || unlimited || !activeColor) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();

    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      if (activeColor === 'w') {
        setWhiteMs((ms) => {
          const next = ms - elapsed;
          if (next <= 0) {
            onFlagRef.current?.('w');
            return 0;
          }
          return next;
        });
      } else {
        setBlackMs((ms) => {
          const next = ms - elapsed;
          if (next <= 0) {
            onFlagRef.current?.('b');
            return 0;
          }
          return next;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [running, unlimited, activeColor]);

  return { whiteMs, blackMs, reset, addIncrement };
}
