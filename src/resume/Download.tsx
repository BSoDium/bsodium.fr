import {
  Button, Card, IconButton, Stack, Tooltip, Typography,
  useColorScheme,
} from '@mui/joy';
import details from 'assets/Details';
import { useMobileMode } from 'components/Responsive';
import jsPDF from 'jspdf';
import useOverlayQueryParam from 'navigation/useOverlayQueryParam';
import React, { createRef } from 'react';
import { FaRegFilePdf } from 'react-icons/fa';
import { FiDownload, FiPrinter } from 'react-icons/fi';

export default function Download() {
  const mobile = useMobileMode();
  const { mode, setMode } = useColorScheme();

  const hidden = useOverlayQueryParam();

  const container = createRef<HTMLDivElement>();

  const fileName = `Resume_${details.name.first}_${details.name.last}.pdf`;

  const print = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('overlay', 'false');
    const printWindow = window.open(url.toString(), '_blank');
    if (printWindow) {
      const savedMode = mode;
      setMode('light');

      printWindow.onafterprint = () => {
        setMode(savedMode || 'system');
        printWindow.close();
        return null;
      };
      printWindow.onbeforeunload = () => {
        setMode(savedMode || 'system');
        return null;
      };
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const download = () => {
    // eslint-disable-next-line new-cap
    const doc = new jsPDF();
    const source = window.document.getElementById('resume') as HTMLElement;
    doc.html(source, {
      callback(d) {
        d.save(fileName);
      },
    });
  };

  return (
    <Stack
      ref={container}
      direction="row"
      justifyContent="center"
      alignItems="center"
      sx={{
        display: hidden ? 'none' : 'flex',
        position: 'fixed',
        bottom: 'var(--nav-safe-area-inset-bottom, 0)',
        width: '100%',
        paddingLeft: 'var(--nav-safe-area-inset-left, 0)',
        zIndex: 2,
      }}
    >
      <Card
        variant="outlined"
        sx={(theme) => ({
          width: mobile ? 'calc(100% - 1rem)' : '30rem',
          margin: mobile ? '.5rem' : '0 0 1rem 0',
          backgroundColor: `color-mix(in srgb, ${theme.palette.background.body}, transparent 30%)`,
          backdropFilter: 'blur(10px)',
          webkitBackdropFilter: 'blur(10px)',
          padding: '.5rem',
          boxShadow: 'lg',
        })}
      >
        <Stack direction="row" gap={1} alignItems="center" justifyContent="space-between">

          <Typography
            level="body2"
            fontWeight={500}
            marginLeft={0.7}
            startDecorator={(
              <FaRegFilePdf size="1.2rem" />
          )}
            sx={{
              gap: 0.5,
              flex: '1 1 100%',
              minWidth: 0,
            }}
          >
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
            >
              {fileName}
            </span>
          </Typography>
          <Stack direction="row" gap={1}>
            {mobile ? (
              <Tooltip placement="top" variant="outlined" title="Print">
                <IconButton
                  color="neutral"
                  variant="plain"
                  onClick={print}
                >
                  <FiPrinter />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                color="neutral"
                variant="plain"
                onClick={print}
                startDecorator={(
                  <FiPrinter />
          )}
              >
                Print
              </Button>
            )}
            {mobile ? (
              <Tooltip placement="top" variant="outlined" title="Download">
                <IconButton
                  variant="solid"
                  onClick={download}
                >
                  <FiDownload />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                onClick={download}
                startDecorator={(
                  <FiDownload />
          )}
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
