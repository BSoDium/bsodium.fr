import { Card, Link, Typography } from "@mui/joy";
import { animated } from "@react-spring/web";
import useOverlayQueryParam from '@/navigation/useOverlayQueryParam';
import { useMobileMode } from "@/components/Responsive";

/**
 * Component displaying credits for this website.
 *
 * **WARNING**: Removing this code violates the license agreement.
 * Any modifications to this code without proper attribution will
 * expose you to legal risks.
 *
 * If you have any doubts about the usage of this code, please
 * contact the author for clarification, by [filing an issue](https://github.com/BSoDium/bsodium.fr/issues/new).
 *
 * *Don't be an asshole, give credit where it's due.*
 */
export default function Copyright() {
  const mobile = useMobileMode();

  const hidden = useOverlayQueryParam();

  const isAuthorDomain = ["bsodium.fr", "www.bsodium.fr"].includes(
    window.location.hostname
  );

  return isAuthorDomain ? null : (
    <Card
      component={animated.div}
      sx={(theme) => ({
        position: "fixed",
        top: "var(--nav-safe-area-inset-top, 0)",
        right: "0",
        width: mobile ? "100vw" : undefined,
        zIndex: 1000,
        display: hidden ? 'none' : 'flex',
        flexDirection: 'row',
        borderRadius: 0,
        borderBottomLeftRadius: mobile ? undefined : "1rem",
        padding: "0.5rem 1rem",
        backgroundColor: `color-mix(in srgb, ${theme.palette.background.body}, transparent 20%)`,
        backdropFilter: "blur(10px)",
        overflow: "auto",
      })}
    >
      <Typography
        level="body2"
        sx={{
          whiteSpace: "nowrap",
        }}
      >
        Credit to{" "}
        <Link href="https://github.com/BSoDium" target="_blank">
          BSoDium
        </Link>{" "}
        for the{" "}
        <Link href="https://www.bsodium.fr" target="_blank">
          original design
        </Link>{" "}
        and{" "}
        <Link href="https://github.com/BSoDium/bsodium.fr" target="_blank">
          code
        </Link>
        .
      </Typography>
    </Card>
  );
}
