import { Button, Card, IconButton, Stack, Tooltip, Typography } from "@mui/joy";
import details from "@/assets/Details";
import { useMobileMode } from "@/components/Responsive";
import useOverlayQueryParam from "@/navigation/useOverlayQueryParam";
import pdf from "@/assets/pdf/resume.pdf";
import { LuDownload,  LuFileText, LuGlasses } from "react-icons/lu";

/**
 * A component that allows the user to download the resume as a PDF.
 */
export default function Download() {
  const mobile = useMobileMode();
  const hidden = useOverlayQueryParam();

  const fileName = `Resume_${details.name.first}_${details.name.last}.pdf`;

  return (
    <Stack
      direction="row"
      justifyContent="center"
      alignItems="center"
      sx={{
        position: "fixed",
        display: hidden ? "none" : "flex",
        bottom: "var(--nav-safe-area-inset-bottom, 0)",
        width: "100%",
        paddingLeft: "var(--nav-safe-area-inset-left, 0)",
        zIndex: 2,
      }}
    >
      <Card
        variant="outlined"
        sx={(theme) => ({
          width: mobile ? "calc(100% - 6rem)" : "30rem",
          margin: mobile ? "1rem" : "0 0 1rem 0",
          marginRight: mobile ? "5rem" : "0",
          borderRadius: "0.75rem 1rem 1rem 0.75rem",
          backgroundColor: `color-mix(in srgb, ${theme.palette.background.body}, transparent 30%)`,
          backdropFilter: "blur(10px)",
          webkitBackdropFilter: "blur(10px)",
          padding: ".5rem",
          boxShadow: "lg",
        })}
      >
        <Stack
          direction="row"
          gap={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography
            level="body2"
            fontWeight={500}
            marginLeft={0.7}
            startDecorator={<LuFileText size="1.2rem" />}
            sx={{
              gap: 0.5,
              flex: "1 1 100%",
              minWidth: 0,
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
            >
              {fileName}
            </span>
          </Typography>
          {mobile ? (
            <Tooltip placement="top" variant="outlined" title="View PDF">
              <IconButton
                component="a"
                href={pdf}
                target="_blank"
                rel="noopener noreferrer"
                variant="plain"
                color="neutral"
              >
                <LuGlasses />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              component="a"
              color="neutral"
              variant="plain"
              href={pdf}
              target="_blank"
              rel="noopener noreferrer"
              startDecorator={<LuGlasses />}
            >
              View
            </Button>
          )}
          {mobile ? (
            <Tooltip placement="top" variant="outlined" title="Download PDF">
              <IconButton
                component="a"
                href={pdf}
                download={fileName}
                variant="solid"
              >
                <LuDownload />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              component="a"
              variant="solid"
              href={pdf}
              download={fileName}
              startDecorator={<LuDownload />}
              sx={{ whiteSpace: "nowrap" }}
            >
              Download
            </Button>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
