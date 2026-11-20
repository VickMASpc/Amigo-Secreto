import { useEffect, useState } from 'react';
import { getCountdown, type CountdownInfo } from '../utils/format';

export function useCountdown(deadlineIso: string): CountdownInfo {
  const [info, setInfo] = useState<CountdownInfo>(() => getCountdown(deadlineIso));

  useEffect(() => {
    setInfo(getCountdown(deadlineIso));
    const timer = window.setInterval(() => {
      setInfo(getCountdown(deadlineIso));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadlineIso]);

  return info;
}
