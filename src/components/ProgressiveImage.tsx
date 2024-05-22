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
  onLoad,
}: {
  src: string;
  placeholder: string;
  alt: string;
  animate?: boolean;
  style?: ComponentProps<typeof animated.img>['style'];
  onLoad?: () => void;
}) {
  const start = useMemo(() => Date.now(), []);

  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState<number>();
  const [currentSrc, setCurrentSrc] = useState(placeholder);

  useEffect(() => {
    const imageToLoad = new Image();
    imageToLoad.src = src;
    imageToLoad.onload = () => {
      setElapsed(Date.now() - start);
      setCurrentSrc(src);
    };
  }, [src]);

  return animate ? (
    <Box
      component={animated.img}
      src={currentSrc}
      className={loading ? 'loading' : ''}
      alt={alt}
      style={style}
      sx={{
        transition: `filter ${Math.round((elapsed || 0) / 4)}ms`,
        '&.loading': {
          filter: `${style?.filter || ''} blur(20px) !important`,
        },
      }}
      onLoad={() => {
        onLoad?.();
        if (currentSrc === src) {
          setLoading(false);
        }
      }}
    />
  ) : (
    <Box
      component="img"
      src={currentSrc}
      className={loading ? 'loading' : ''}
      alt={alt}
      style={style as React.CSSProperties}
      sx={{
        transition: `filter ${Math.round((elapsed || 0) / 4)}ms`,
        '&.loading': {
          filter: `${style?.filter || ''} blur(20px) !important`,
        },
      }}
      onLoad={() => {
        onLoad?.();
        if (currentSrc === src) {
          setLoading(false);
        }
      }}
    />
  );
}
