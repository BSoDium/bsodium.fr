import { Button, Card, Stack, Typography } from "@mui/joy";
import { animated, useSpringRef, useTransition } from "@react-spring/web";
import useOverlayQueryParam from '@/navigation/useOverlayQueryParam';
import { useEffect, useState } from "react";

export default function AnalyticsBanner() {
  const [isDismissed, setIsDismissed] = useState(
    localStorage.getItem("analyticsBannerDismissed") === "true"
  );

  const hidden = useOverlayQueryParam();

  const transitionRef = useSpringRef();

  const transition = useTransition(isDismissed, {
    ref: transitionRef,
    keys: null,
    from: { opacity: 0, transform: "translateY(2rem)" },
    enter: { opacity: 1, transform: "translateY(0rem)" },
    leave: { opacity: 0, transform: "translateY(2rem)" },
  });

  useEffect(() => {
    transitionRef.start();
  }, [transitionRef, isDismissed]);

  const dismiss = () => {
    localStorage.setItem("analyticsBannerDismissed", "true");
    setIsDismissed(true);
  };

  return transition((style, item) => {
    if (item) {
      return null;
    }
    return (
      <Card
        component={animated.div}
        variant="outlined"
        sx={(theme) => ({
          display: hidden ? 'none' : 'flex',
          position: 'fixed',
          bottom: 'var(--nav-safe-area-inset-bottom, 0)',
          marginBottom: '1rem',
          left: '50%',
          backgroundColor: theme.palette.background.body,
          zIndex: 1000,
          width: "min(100% - 2rem, 45rem)",
          boxShadow: "xl",
        })}
        style={{
          ...style,
          transform: style.transform.to((t) => `${t} translateX(-50%)`),
        }}
      >
        <Stack gap={2}>
          <Stack gap={1}>
            <Typography level="body1" fontWeight="600">
              Hey there mate 👋
            </Typography>
            <Typography level="body2" textColor="text.primary">
              I gather analytics to understand how you use this site and to
              improve your experience. Adding this page to your ad blocker
              whitelist would mean a lot. You won&apos;t see any ads, and your
              data will still be kept private.
            </Typography>
          </Stack>

          <Stack direction="row" gap={1} justifyContent="flex-end">
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
                transition: "all 0.2s",
                backgroundColor: theme.palette.text.primary,
                color: theme.palette.background.body,
                "&:hover": {
                  backgroundColor: theme.palette.text.secondary,
                },
                "&:active": {
                  backgroundColor: theme.palette.text.tertiary,
                },
              })}
              onClick={() => {
                dismiss();
                window.location.reload();
              }}
            >
              I&apos;ve whitelisted this site
            </Button>
          </Stack>
        </Stack>
      </Card>
    );
  });
}
