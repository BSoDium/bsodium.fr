import React, { useMemo } from 'react';
import planetDark from 'assets/planet_dark.webp';
import planetLight from 'assets/planet_light.png';
import balloon from 'assets/balloon.png';
import spaceStation from 'assets/space-station.webp';
import sky from 'assets/sky.webp';
import { Box, useColorScheme } from '@mui/joy';
import { Parallax } from 'react-scroll-parallax';
import { useMobileMode } from './Responsive';

export default function Illustrations() {
  const { colorScheme } = useColorScheme();
  const mobile = useMobileMode();

  const dark = useMemo(() => colorScheme === 'dark', [colorScheme]);

  return (
    <Parallax speed={-20} startScroll={0} disabled={mobile} style={{ overflow: 'visible' }}>
      <div style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
      }}
      >
        {dark ? (
          <>
            <img
              src={sky}
              alt="sky"
              style={{
                position: 'absolute',
                width: 'max(100vw, 200vh)',
                top: '0',
                left: '0',
                zIndex: -1,
                filter: 'brightness(0.5)',
                maskImage: 'linear-gradient(to bottom, black 10%, transparent 90%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 10%, transparent 90%)',
              }}
            />
            <img
              src={sky}
              alt="sky"
              style={{
                position: 'absolute',
                width: 'max(100vw, 200vh)',
                top: 'calc(max(100vw, 200vh) / 7)',
                left: '0',
                zIndex: -1,
                transform: 'scaleY(-1)',
                filter: 'blur(calc(100vw / 1200)) brightness(0.5)',
                maskImage: 'linear-gradient(to bottom, transparent 20%, #00000059 50%, transparent 70%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 20%, 00000059 50%, transparent 80%)',
              }}
            />
            <img
              src={planetDark}
              alt="planet"
              style={{
                position: 'absolute',
                width: '75rem',
                top: '-44rem',
                left: 'calc(50% - 37.5rem)',
                zIndex: -1,
                filter: `${mobile ? 'brightness(0.5)' : 'brightness(1)'} hue-rotate(20deg) drop-shadow(0 0 4rem #0C0223) drop-shadow(-3rem -3rem 3rem #3570b55b)`,
                animation: 'spin 360s linear infinite',
              }}
            />
            <Box
              component="img"
              src={spaceStation}
              alt="space station"
              sx={{
                position: 'absolute',
                width: 'min(500px, 80vw)',
                top: mobile ? '5rem' : '12rem',
                left: '50%',
                transform: `translateX(${mobile ? '-50%' : '20vw'})`,
                zIndex: -1,
                filter: `${mobile ? 'brightness(0.6)' : 'brightness(1)'} drop-shadow(0 0 .5rem #141619b0) drop-shadow(.5rem -.5rem 2rem #8fa4cc4e)`,
              }}
            />
          </>
        ) : (
          <>
            <div style={{
              position: 'absolute',
              height: '100vh',
              width: '100vw',
              top: '0',
              left: '0',
              zIndex: -1,
              background: 'linear-gradient(to bottom, #5594bc, transparent)',
            }}
            />
            <img
              src={sky}
              alt="sky"
              style={{
                position: 'absolute',
                width: 'max(100vw, 200vh)',
                top: '0',
                left: '0',
                zIndex: -1,
                opacity: 0.5,
                mixBlendMode: 'color-dodge',
                maskImage: 'linear-gradient(to bottom, black, transparent 20%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 20%)',
              }}
            />
            <img
              src={planetLight}
              alt="planet"
              style={{
                position: 'absolute',
                width: '75rem',
                top: '-44rem',
                left: 'calc(50% - 37.5rem)',
                zIndex: -1,
                animation: 'spin 360s linear infinite',
              }}
            />
            <Box
              component="img"
              src={balloon}
              alt="balloon"
              sx={{
                position: 'absolute',
                width: 'min(200px, 30vw)',
                top: mobile ? '5rem' : '12rem',
                left: '55%',
                transform: `translateX(${mobile ? '-50%' : '20vw'})`,
                animation: 'float 20s ease-in-out infinite',
                zIndex: -1,
              }}
            />
          </>
        )}

      </div>
    </Parallax>
  );
}
