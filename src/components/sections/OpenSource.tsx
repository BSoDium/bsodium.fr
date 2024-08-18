import { Avatar, Stack, Typography, useColorScheme } from "@mui/joy";
import { useMemo } from "react";
import vader from "@/assets/vader.webp";
import vaderMin from "@/assets/vader.min.webp";
import { RiOpenSourceLine } from "react-icons/ri";
import { Parallax } from "react-scroll-parallax";
import ProgressiveImage from "@/components/ProgressiveImage";
import { Default, Mobile, useMobileMode } from "@/components/Responsive";

export default function OpenSource() {
  const { colorScheme } = useColorScheme();
  const dark = useMemo(() => colorScheme === "dark", [colorScheme]);

  const mobile = useMobileMode();

  const flickerAnimation = useMemo(
    () => ({
      "@keyframes flicker": Object.fromEntries(
        [...Array(10).keys()]
          .map(() => Math.random() * 100)
          .sort()
          .map((p) => [
            [`${p - 1}%`, { opacity: 1 }],
            [`${p}%`, { opacity: 0 }],
            [`${p + 1}%`, { opacity: 1 }],
          ])
          .flat()
      ),
    }),
    []
  );

  return (
    <Stack
      p="20px"
      sx={{ position: "relative" }}
      marginBottom={mobile ? "5rem" : 0}
    >
      <Stack
        sx={{
          width: "100%",
          height: mobile ? "45rem" : "400px",
          // overflow: 'hidden',
        }}
      >
        <Stack
          sx={{
            position: "absolute",
            top: "-20px",
            gap: 3,
            textAlign: mobile ? "center" : "right",
            ...(mobile
              ? {
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "100%",
                  alignItems: "center",
                }
              : {
                  right: "0",
                  alignItems: "flex-end",
                }),
          }}
        >
          <Mobile>
            <Avatar
              color="success"
              sx={(theme) => ({
                position: "relative",
                border: "none",
                outline: `2px solid ${theme.palette.success[500]}`,
                boxShadow: `0 0 40px 5px rgba(${theme.palette.success.mainChannel} / 0.4)`,
                overflow: "visible",
                marginTop: "3rem",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: "-5rem",
                  height: "5rem",
                  width: "2px",
                  background: `linear-gradient(to bottom, transparent, ${theme.palette.success[400]})`,
                },
              })}
            >
              <RiOpenSourceLine />
            </Avatar>
          </Mobile>
          <Typography
            level="h2"
            sx={{
              position: "relative",
            }}
          >
            <Typography color="success" fontWeight="xl">
              Open-source.
            </Typography>
            {mobile ? <br /> : " "}
            Join the{" "}
            <Typography
              sx={(theme) => ({
                ...flickerAnimation,
                ...(dark
                  ? {
                      textShadow: `0 0 1px ${theme.palette.text.primary}, 0 0 .5rem ${theme.palette.text.primary}, 0 0 3rem ${theme.palette.text.secondary}`,
                      color: "white",
                      animation: "flicker 5s infinite",
                      animationDelay: `${Math.random() * 2}s`,
                      fontWeight: "300",
                    }
                  : {
                      color: theme.palette.text.primary,
                      fontWeight: "900",
                      fontFamily: '"Lobster", sans-serif',
                    }),
                padding: "3rem",
                margin: "-3rem",
              })}
            >
              {dark ? "dark side" : "bold side"}
            </Typography>{" "}
            of the force.
            <Default>
              <Avatar
                color="success"
                sx={(theme) => ({
                  position: "absolute",
                  top: "0",
                  right: "-50px",
                  transform: "translateX(50%)",
                  border: "none",
                  outline: `2px solid ${theme.palette.success[500]}`,
                  boxShadow: `0 0 40px 5px rgba(${theme.palette.success.mainChannel} / 0.4)`,
                })}
              >
                <RiOpenSourceLine />
              </Avatar>
            </Default>
          </Typography>
          <Typography
            level="h6"
            textColor="text.tertiary"
            sx={{
              maxWidth: "500px",
            }}
          >
            <Typography textColor="text.primary">Collaboration</Typography> and{" "}
            <Typography textColor="text.primary">
              community-maintained projects
            </Typography>{" "}
            lay the foundation upon which the digital world we live in is built.
            Any <Typography textColor="text.primary">contribution</Typography>,
            no matter how small, is and will always be appreciated.
          </Typography>
        </Stack>
        <Parallax
          speed={10}
          opacity={[0, 1]}
          easing="ease"
          disabled={mobile}
          style={
            mobile
              ? {
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "25rem",
                  zIndex: 1,
                  animation: "float 20s ease-in-out infinite",
                }
              : {
                  position: "absolute",
                  right: "calc(350px + 20%)",
                  top: "2rem",
                  zIndex: 1,
                  animation: "float 20s ease-in-out infinite",
                }
          }
        >
          <ProgressiveImage
            src={vader}
            placeholder={vaderMin}
            alt="Darth vader"
            style={{
              ...(mobile
                ? {
                    height: "350px",
                  }
                : {
                    height: "500px",
                  }),
              filter:
                "drop-shadow(0 -20px 20px hsla(185, 74%, 41%, 0.299)) drop-shadow(0 20px 20px hsla(7, 57%, 51%, 0.364))",
            }}
          />
        </Parallax>
      </Stack>
    </Stack>
  );
}
