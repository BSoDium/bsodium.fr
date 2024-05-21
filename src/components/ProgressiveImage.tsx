import { Box } from '@mui/joy';
import { animated } from '@react-spring/web';
import React, {
  ComponentProps,
  useEffect,
  useMemo,
  useState,
} from 'react';

export default function ProgressiveImage({
  src,
  placeholder,
  alt,
  animate = false,
  style,
}: ComponentProps<typeof animated.img> & {
  src: string;
  placeholder: string;
  alt: string;
  animate?: boolean;
  style: ComponentProps<typeof animated.img>['style'];
}) {
  const start = useMemo(() => Date.now(), []);

  const [loading, setLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState(placeholder);

  const elapsed = useMemo(() => (loading ? null : Date.now() - start), [start, loading]);

  useEffect(() => {
    const imageToLoad = new Image();
    imageToLoad.src = src;
    imageToLoad.onload = () => {
      setCurrentSrc(src);
      setLoading(false);
    };
  }, [src]);

  return animate ? (
    <Box
      component={animated.img}
      src={currentSrc}
      className={loading ? 'loading' : ''}
      alt={alt}
      style={{
        ...style,
        transition: `filter ${Math.max((elapsed || 0) / 4, 100)}ms`,
      }}
      sx={{
        '&.loading': {
          filter: `${style?.filter} blur(20px) !important`,
        },
      }}
    />
  ) : (
    <Box
      component="img"
      src={currentSrc}
      className={loading ? 'loading' : ''}
      alt={alt}
      style={{
        ...(style as React.CSSProperties),
        transition: `filter ${Math.min(elapsed || 0, 100)}ms`,
      }}
      sx={{
        '&.loading': {
          filter: `${style?.filter} blur(20px) !important`,
        },
      }}
    />
  );
}
