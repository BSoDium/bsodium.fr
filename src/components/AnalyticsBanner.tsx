import {
  Button, Card, Stack, Typography,
} from '@mui/joy';
import React, { useEffect, useState } from 'react';

const devMode = process.env.NODE_ENV === 'development';

export default function AnalyticsBanner() {
  const [isAnalyticsBlocked, setIsAnalyticsBlocked] = useState(false);
  const [isDimissed, setIsDimissed] = useState(localStorage.getItem('analyticsBannerDismissed') === 'true');

  useEffect(() => {
    const checkAnalyticsBlocked = () => {
      // Listen for any errors
      window.onerror = (_, source) => {
        if (source && source.includes('google-analytics.com')) {
          setIsAnalyticsBlocked(true);
        }
        return false;
      };

      // Check network requests for Google Analytics
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      resources.forEach((resource) => {
        if (resource.name.includes('google-analytics.com') && resource.initiatorType === 'script') {
          setIsAnalyticsBlocked(true);
        }
      });

      // Additionally, check for blocked scripts directly
      const script = document.createElement('script');
      script.src = 'https://www.google-analytics.com/analytics.js';
      script.onerror = () => {
        setIsAnalyticsBlocked(true);
      };
      document.head.appendChild(script);
    };

    checkAnalyticsBlocked();
  }, []);

  const dismiss = () => {
    localStorage.setItem('analyticsBannerDismissed', 'true');
    setIsDimissed(true);
  };

  return !isDimissed && (isAnalyticsBlocked || devMode) ? (
    <Card
      variant="outlined"
      sx={(theme) => ({
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: theme.palette.background.body,
        zIndex: 1000,
        width: 'min(100%, 45rem)',
        boxShadow: 'xl',
      })}
    >
      <Stack gap={2}>
        <Stack gap={1}>
          <Typography level="body1" fontWeight="600">
            Hey there mate 👋
          </Typography>
          <Typography level="body2" textColor="text.primary">
            I gather analytics to understand how you use this site and to improve your experience.
            {' '}
            Adding this page to your ad blocker whitelist would mean a lot. You won&apos;t see any
            {' '}
            ads, and your data will be kept private.
          </Typography>
        </Stack>
        <Stack direction="row" gap={1} justifyContent="end">
          <Button
            size="sm"
            variant="outlined"
            color="neutral"
            onClick={dismiss}
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            color="neutral"
            sx={(theme) => ({
              transition: 'all 0.2s',
              backgroundColor: theme.palette.text.primary,
              color: theme.palette.background.body,
              '&:hover': {
                backgroundColor: theme.palette.text.secondary,
              },
              '&:active': {
                backgroundColor: theme.palette.text.tertiary,
              },
            })}
            onClick={() => {
              window.location.reload();
            }}
          >
            I&apos;ve whitelisted bsodium.fr
          </Button>
        </Stack>
      </Stack>
    </Card>
  ) : null;
}
