import { RefObject, useEffect, useState } from "react";

interface Size {
  width: number;
  height: number;
}

export function useResizeObserver<T extends HTMLElement>(
  ref: RefObject<T | null>
): Size {
  const [size, setSize] = useState<Size>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;

      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return size;
}
