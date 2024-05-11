import { Box } from '@mui/joy';
import React from 'react';
import { useMobileMode } from './Responsive';

export default function Divider() {
  const mobile = useMobileMode();
  return (
    <Box
      component="div"
      sx={(theme) => ({
        position: 'relative',
        marginX: '50px',
        marginY: '80px',
        height: '2px',
        width: 'calc(100% - 100px)',
        background: `linear-gradient(to right, ${theme.palette.warning[700]}, ${theme.palette.success[400]})`,
        '&::before': mobile ? {} : {
          content: '""',
          position: 'absolute',
          left: '-80px',
          top: '-80px',
          height: '82px',
          width: '80px',
          borderBottomLeftRadius: '80px',
          border: `2px solid ${theme.palette.warning[700]}`,
          borderRight: 'none',
          borderTop: 'none',
        },
        '&::after': mobile ? {} : {
          content: '""',
          position: 'absolute',
          right: '-80px',
          bottom: '-78px',
          height: '80px',
          width: '80px',
          borderTopRightRadius: '80px',
          border: `2px solid ${theme.palette.success[400]}`,
          borderLeft: 'none',
          borderBottom: 'none',
        },
      })}
    />
  );
}
