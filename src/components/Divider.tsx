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
        marginX: '20px',
        marginY: '50px',
        height: '1px',
        width: 'calc(100% - 40px)',
        background: `linear-gradient(to right, ${theme.palette.warning[700]}, ${theme.palette.success[400]})`,
        '&::before': mobile ? {} : {
          content: '""',
          position: 'absolute',
          left: '-50px',
          top: '-50px',
          height: '51px',
          width: '50px',
          borderBottomLeftRadius: '50px',
          border: `1.5px solid ${theme.palette.warning[700]}`,
          borderRight: 'none',
          borderTop: 'none',
        },
        '&::after': mobile ? {} : {
          content: '""',
          position: 'absolute',
          right: '-50px',
          bottom: '-50px',
          height: '51px',
          width: '50px',
          borderTopRightRadius: '50px',
          border: `1.5px solid ${theme.palette.success[400]}`,
          borderLeft: 'none',
          borderBottom: 'none',
        },
      })}
    />
  );
}
