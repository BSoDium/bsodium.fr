/* eslint-disable no-plusplus */
/* eslint-disable react/no-unknown-property */
import {
  Avatar,
  Box, Stack, Typography, useTheme,
} from '@mui/joy';
import { AsciiRenderer } from '@react-three/drei';
import {
  Canvas, useFrame, useThree,
} from '@react-three/fiber';
import { ATypography } from 'App';
import { HiOutlineCheckBadge } from 'react-icons/hi2';
import React, { useEffect, useRef } from 'react';

import {
  Group, Mesh, MeshStandardMaterial, SphereGeometry,
} from 'three';
import { Default } from './Responsive';

function Icosahedron() {
  const meshRef = useRef<Mesh>(null);
  const viewport = useThree((state) => state.viewport);
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta / 10;
      meshRef.current.rotation.y += delta / 10;
    }
  });
  return (
    <mesh scale={Math.min(viewport.width, viewport.height) / 5} ref={meshRef}>
      <icosahedronGeometry args={[1.2, 1]} />
      <meshStandardMaterial color="grey" />
    </mesh>
  );
}

function AsteroidRing() {
  const groupRef = useRef<Group>(null);
  const viewport = useThree((state) => state.viewport);
  const numAsteroids = 1000;
  const radius = (2.4 * Math.min(viewport.width, viewport.height)) / 5;
  const asteroidRadius = 0.05;
  const asteroidGeometry = new SphereGeometry(asteroidRadius, 1, 1);
  const asteroidMaterial = new MeshStandardMaterial({ color: 'grey' });

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.set((-7.5 * Math.PI) / 16, (0.2 * Math.PI) / 4, 0);
      for (let i = 0; i < numAsteroids; i++) {
        const asteroid = new Mesh(asteroidGeometry, asteroidMaterial);
        const angle = (i / numAsteroids) * Math.PI * 2;
        const x = Math.cos(angle) * (radius + (Math.random() - 0.5));
        const y = Math.sin(angle) * (radius + (Math.random() - 0.5));
        const z = (Math.random() - 0.5) * 0.1;
        asteroid.position.set(x, y, z);
        asteroid.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        );
        groupRef.current.add(asteroid);
      }
    }
  }, [groupRef, numAsteroids, radius]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta / 9;
    }
  });

  return (
    <group ref={groupRef} />
  );
}

function View() {
  const theme = useTheme();
  return (
    <Canvas style={{
      height: '100%',
    }}
    >
      <color attach="background" args={['black']} />
      <pointLight position={[0, 0, 0]} />
      <pointLight position={[-10, 0, 0]} />
      <ambientLight intensity={0.05} />
      <Icosahedron />
      <AsteroidRing />
      <AsciiRenderer fgColor={theme.palette.text.primary} characters=" .,:-+*=/%@#" bgColor="transparent" />
    </Canvas>
  );
}

export default function Footer() {
  return (
    <Box
      component={Stack}
      direction="row"
      flexWrap="wrap"
      gap={7}
      p="20px"
      justifyContent="space-between"
      sx={{ position: 'relative' }}
    >
      <Default>
        <Stack sx={{ width: '100%', height: '300px' }}>
          <Stack
            sx={{
              position: 'absolute',
              top: '-20px',
              right: '0',
              gap: 1,
              textAlign: 'right',
            }}
          >
            <Typography
              level="h2"
              sx={{
                position: 'relative',
              }}
            >
              <Typography
                textColor="danger.400"
                fontWeight="xl"
              >
                Software.
              </Typography>
              {' '}
              The way we see it.
              <Avatar
                color="danger"
                sx={(theme) => ({
                  position: 'absolute',
                  top: '0',
                  right: '-50px',
                  transform: 'translateX(50%)',
                  border: 'none',
                  outline: `1.5px solid ${theme.palette.danger[400]}`,
                  boxShadow: `0 0 40px 5px ${theme.palette.danger[700]}`,
                })}
              >
                <HiOutlineCheckBadge />
              </Avatar>
            </Typography>
            <Typography
              level="body1"
              textColor="text.secondary"
            >
              Let&apos;s build products that people love. Together.
            </Typography>
          </Stack>
          <View />
        </Stack>
      </Default>
      <Typography level="body2" textColor="text.tertiary">
        ©
        {' '}
        {new Date().getFullYear()}
        {' '}
        Elliot Négrel-Jerzy. All rights reserved.
      </Typography>
      <Typography level="body2" textColor="text.tertiary">
        Illustrations generated with
        {' '}
        <ATypography href="https://www.bing.com/create">
          Bing Image Creator
        </ATypography>
        {' '}
        powered by
        {' '}
        <ATypography href="https://openai.com/product/dall-e-2/">
          DALL·E
        </ATypography>
        .
      </Typography>
    </Box>
  );
}
