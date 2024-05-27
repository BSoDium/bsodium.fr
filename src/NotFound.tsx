import { Stack, Typography } from '@mui/joy';
import React, { useEffect, useState } from 'react';
import { ReactComponent as Sparkle } from 'assets/svg/sparkle.svg';
import { ReactComponent as SparkleThin } from 'assets/svg/sparkle-thin.svg';
import { ReactComponent as Square } from 'assets/svg/square.svg';
import { ReactComponent as Flower } from 'assets/svg/flower.svg';
import TypeWriter from 'components/TypeWriter';
import { animated, useSpringValue } from '@react-spring/web';

function getRandomRotation() {
  const random = Math.random();
  if (random < 0.33) {
    return 90;
  } if (random < 0.66) {
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
        sparkle: prev.sparkle + getRandomRotation(),
        square: prev.square + getRandomRotation(),
        flower: prev.flower + getRandomRotation(),
        sparkleThin: prev.sparkleThin + getRandomRotation(),
      }));
    }, 2000);
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

  return (
    <Stack direction="row" flexWrap="wrap" columnGap={10} rowGap={0} justifyContent="center" alignItems="center" width="100%" height="100%">
      <Stack gap={1}>
        <Stack gap={1} direction="row">
          <animated.div style={{
            rotate: sparkleRotation.to((deg) => `${deg}deg`),
            width: 200,
            height: 200,
          }}
          >
            <Sparkle />
          </animated.div>
          <animated.div style={{
            rotate: squareRotation.to((deg) => `${deg}deg`),
            width: 200,
            height: 200,
          }}
          >
            <Square />
          </animated.div>
        </Stack>
        <Stack gap={1} direction="row">
          <animated.div style={{
            rotate: flowerRotation.to((deg) => `${deg}deg`),
            width: 200,
            height: 200,
          }}
          >
            <Flower style={{ transform: `rotate(${rotations.flower}deg)` }} />
          </animated.div>
          <animated.div style={{
            rotate: sparkleThinRotation.to((deg) => `${deg}deg`),
            width: 200,
            height: 200,
          }}
          >
            <SparkleThin style={{ transform: `rotate(${rotations.sparkleThin}deg)` }} />
          </animated.div>
        </Stack>
      </Stack>
      <Stack gap={5}>
        <Typography level="display1" fontSize="15rem" lineHeight={0.9} fontFamily='"Lobster", sans-serif'>404</Typography>
        <Typography
          level="h2"
          fontFamily='"Lobster", sans-serif'
          fontWeight="300"
          width="25rem"
        >
          <TypeWriter
            typeInterval={20}
          >
            We could not find the page you&apos;re looking for :(
          </TypeWriter>
        </Typography>
      </Stack>
    </Stack>
  );
}
