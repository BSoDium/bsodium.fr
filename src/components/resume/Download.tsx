import {
  Button,
  Card,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useColorScheme,
} from "@mui/joy";
import details from "@/assets/Details";
import { useMobileMode } from "@/components/Responsive";
import jsPDF from "jspdf";
import useOverlayQueryParam from "@/navigation/useOverlayQueryParam";
import { createRef, useState } from "react";
import { FaRegFilePdf } from "react-icons/fa";
import { FiDownload, FiPrinter } from "react-icons/fi";

/**
 * A component that allows the user to download the resume as a PDF.
 */
export default function Download() {
  const mobile = useMobileMode();
  const { mode, setMode } = useColorScheme();
  const hidden = useOverlayQueryParam();

  const [downloadLoading, setDownloadLoading] = useState(false);

  const container = createRef<HTMLDivElement>();

  const fileName = `Resume_${details.name.first}_${details.name.last}.pdf`;

  const print = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("overlay", "false");
    const printWindow = window.open(url.toString(), "_blank");
    if (printWindow) {
      const savedMode = mode;
      setMode("light");

      printWindow.addEventListener("afterprint", () => {
        setMode(savedMode || "system");
        printWindow.close();
        return null;
      });
      printWindow.addEventListener("beforeunload", () => {
        setMode(savedMode || "system");
        return null;
      });
      printWindow.addEventListener("load", () => {
        printWindow.print();
      });
    }
  };

  const download = () => {
    setDownloadLoading(true);

    const doc = new jsPDF({
      orientation: "p",
      format: "a4",
      unit: "px",
      hotfixes: ["px_scaling"],
    });
    const source = document.body;

    // Get the HTML content dimensions
    const sourceWidth = source.offsetWidth;
    const sourceHeight = source.offsetHeight;

    // Define the margins and PDF page dimensions
    const margin = 5;
    const pdfWidth = doc.internal.pageSize.getWidth() - 2 * margin;
    const pdfHeight = doc.internal.pageSize.getHeight() - 2 * margin;

    // Calculate the scale factor to fit the HTML content within the PDF page
    const scale = Math.min(pdfWidth / sourceWidth, pdfHeight / sourceHeight);

    // Adjust width and windowWidth to fit the scale
    const adjustedWidth = sourceWidth * scale;
    // const adjustedHeight = sourceHeight * scale;
    const windowWidth = sourceWidth; // This can be set to the actual HTML width

    try {
      doc.html(source, {
        callback(d) {
          d.save(fileName);
          setDownloadLoading(false);
        },
        x: margin,
        y: margin,
        autoPaging: "text",
        width: adjustedWidth,
        windowWidth,
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <Stack
      ref={container}
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
          width: mobile ? "calc(100% - 1rem)" : "30rem",
          margin: mobile ? ".5rem" : "0 0 1rem 0",
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
            startDecorator={<FaRegFilePdf size="1.2rem" />}
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
          <Stack direction="row" gap={1}>
            {mobile ? (
              <Tooltip placement="top" variant="outlined" title="Print">
                <IconButton color="neutral" variant="plain" onClick={print}>
                  <FiPrinter />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                color="neutral"
                variant="plain"
                onClick={print}
                startDecorator={<FiPrinter />}
              >
                Print
              </Button>
            )}
            {mobile ? (
              <Tooltip placement="top" variant="outlined" title="Download">
                <IconButton variant="solid" onClick={download} disabled>
                  {downloadLoading ? (
                    <CircularProgress size="sm" />
                  ) : (
                    <FiDownload />
                  )}
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                disabled
                onClick={download}
                loading={downloadLoading}
                loadingPosition="start"
                startDecorator={<FiDownload />}
              >
                Download
              </Button>
            )}
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}
