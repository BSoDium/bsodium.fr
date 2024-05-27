import { Stack, Typography } from '@mui/joy';
import React, { CSSProperties, useEffect, useState } from 'react';
import { ReactComponent as Sparkle } from 'assets/svg/sparkle.svg';
import { ReactComponent as SparkleThin } from 'assets/svg/sparkle-thin.svg';
import { ReactComponent as Square } from 'assets/svg/square.svg';
import { ReactComponent as Flower } from 'assets/svg/flower.svg';
import TypeWriter from 'components/TypeWriter';
import { animated, useSpringValue } from '@react-spring/web';

function getRandomRotation(prev = 0) {
  const random = Math.random();
  if (random < 0.33 && prev !== 90) {
    return 90;
  } if (random < 0.66 && prev !== -90) {
    return -90;
  }
  return 0;
}

export default function NotFound() {
  const [rotations, setRotations] = useState({
    sparkle: 0,
    square: 0,
    flower: 0,
    sparkleThin: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRotations((prev) => ({
        sparkle: getRandomRotation(prev.sparkle),
        square: getRandomRotation(prev.square),
        flower: getRandomRotation(prev.flower),
        sparkleThin: getRandomRotation(prev.sparkleThin),
      }));
    }, 1500);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const sparkleRotation = useSpringValue(rotations.sparkle);
  const squareRotation = useSpringValue(rotations.square);
  const flowerRotation = useSpringValue(rotations.flower);
  const sparkleThinRotation = useSpringValue(rotations.sparkleThin);

  useEffect(() => {
    sparkleRotation.start(rotations.sparkle);
    squareRotation.start(rotations.square);
    flowerRotation.start(rotations.flower);
    sparkleThinRotation.start(rotations.sparkleThin);
  }, [rotations, sparkleRotation, squareRotation, flowerRotation, sparkleThinRotation]);

  const svgStyle: CSSProperties = {
    aspectRatio: '1 / 1',
    width: '100%',
    height: '100%',
  };

  return (
    <Stack direction="row" flexWrap="wrap" columnGap={10} rowGap={0} justifyContent="center" alignItems="center" width="100%" height="100%">
      <Stack
        gap={1}
        sx={{
          maxWidth: '90vw',
          maxHeight: '90vw',
        }}
      >
        <Stack
          gap={1}
          direction="row"
          sx={{
            width: '100%',
            height: 'min(45vw, 200px)',
          }}
        >
          <animated.div style={{
            rotate: sparkleRotation.to((deg) => `${deg}deg`),
          }}
          >
            <Sparkle style={svgStyle} />
          </animated.div>
          <animated.div style={{
            rotate: squareRotation.to((deg) => `${deg}deg`),
          }}
          >
            <Square style={svgStyle} />
          </animated.div>
        </Stack>
        <Stack
          gap={1}
          direction="row"
          sx={{
            width: '100%',
            height: 'min(45vw, 200px)',
          }}
        >
          <animated.div style={{
            rotate: flowerRotation.to((deg) => `${deg}deg`),
          }}
          >
            <Flower style={svgStyle} />
          </animated.div>
          <animated.div style={{
            rotate: sparkleThinRotation.to((deg) => `${deg}deg`),
          }}
          >
            <SparkleThin style={svgStyle} />
          </animated.div>
        </Stack>
      </Stack>
      <Stack gap={5}>
        <Typography level="display1" fontSize="clamp(7rem, 20vw, 15rem)" lineHeight={0.9} fontFamily='"Lobster", sans-serif'>404</Typography>
        <Typography
          level="h4"
          fontFamily='"Fira Code", monospace'
          fontSize="clamp(0.5rem, 5vw, 1.5rem)"
          fontWeight="300"
          width="25rem"
        >
          <TypeWriter
            typeInterval={20}
          >
            We could not find the page you&apos;re looking for.
          </TypeWriter>
        </Typography>
      </Stack>
    </Stack>
  );
}
