import { Card, Link, Typography } from '@mui/joy';
import React from 'react';
import { animated } from '@react-spring/web';
import { useLandScapeMode, useMobileMode } from './Responsive';

/**
 * Component displaying credits for this website.
 *
 * **WARNING**: Removing this code violates the license agreement.
 * Any modifications to this code without proper attribution will
 * expose you to legal action.
 *
 * If you have any doubts about the usage of this code, please
 * contact the author for clarification, by [filing an issue](https://github.com/BSoDium/bsodium.fr/issues/new).
 *
 * *Don't be an asshole, give credit where it's due.*
 */
export default function Credits() {
  const mobile = useMobileMode();
  const landscape = useLandScapeMode();

  const isAuthorDomain = ['bsodium.fr', 'www.bsodium.fr'].includes(window.location.hostname);

  return isAuthorDomain ? null : (
    <Card
      component={animated.div}
      sx={{
        position: 'fixed',
        top: !landscape && !mobile ? '3rem' : '0',
        right: '0',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'row',
        borderRadius: 0,
        borderBottomLeftRadius: '1rem',
        padding: '0.5rem 1rem',
      }}
    >
      <Typography level="body2">
        Credit to
        {' '}
        <Link href="https://github.com/BSoDium" target="_blank">
          BSoDium
        </Link>
        {' '}
        for the original design and code.
      </Typography>
    </Card>
  );
}
