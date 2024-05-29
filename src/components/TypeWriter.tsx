import { Typography } from '@mui/joy';
import { SxProps } from '@mui/joy/styles/types';
import React, { useEffect, useState } from 'react';

/**
 * A typewriter effect that types out the text in `children` one character at a time.
 */
export default function TypeWriter({
  children: toText,
  typeInterval = 50,
  onTransitionEnd = () => {
    // noop
  },
  sx,
}: {
  /**
   * The text to be typed out by the typewriter effect.
   */
  children: string
  /**
   * The interval (in milliseconds) between typing each character.
   * Default: 50
   */
  typeInterval?: number
  /**
   * A callback function that is called when the typing animation ends.
   */
  onTransitionEnd?: () => void
  /**
   * The style props for the Typography component.
   */
  sx?: SxProps
}) {
  // Text that is currently displayed
  const [currentText, setCurrentText] = useState('');
  // Cursor element
  const cursorRef = React.createRef<HTMLSpanElement>();

  // Blink the cursor only when the animation is not playing
  useEffect(() => {
    const typing = currentText !== toText;
    if (cursorRef.current) {
      cursorRef.current.style.animation = typing ? 'none' : 'blink 1s infinite';
    }
  }, [currentText, toText]);

  useEffect(() => {
    // If the text is the same, do nothing
    if (toText === currentText) {
      onTransitionEnd();
      return () => {
        // noop
      };
    }

    // If the text is different, start the animation
    const interval = setInterval(() => {
      // If the text is the same, stop the animation (should never be reached)
      if (toText === currentText) {
        clearInterval(interval);
        return;
      }

      // if currentText is included in toText, add one more character
      if (toText.startsWith(currentText)) {
        setCurrentText(toText.slice(0, currentText.length + 1));
      } else {
        // if currentText is not included in toText, remove one character
        setCurrentText(currentText.slice(0, currentText.length - 1));
      }
    }, Math.random() * 6 * typeInterval);
    return () => { clearInterval(interval); };
  }, [toText, currentText]);

  return (
    <Typography
      sx={sx}
    >
      {currentText}
      <span ref={cursorRef} style={{ fontWeight: '200' }}>|</span>
    </Typography>
  );
}
