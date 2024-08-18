import { Avatar, Stack, Typography } from "@mui/joy";
import { FaDeviantart, FaGithub, FaGitlab, FaLinkedin } from "react-icons/fa";
import { FiMail, FiPhone } from "react-icons/fi";
import { SiResearchgate } from "react-icons/si";
import details from "@/assets/Details";
import LinkCarousel from "./LinkCarousel";
import { Default, Mobile, useMobileMode } from "@/components/Responsive";

export default function Contact() {
  const mobile = useMobileMode();

  return (
    <Stack
      gap={3}
      marginBottom={mobile ? "7rem" : 0}
      sx={{
        zIndex: 1,
        textAlign: mobile ? "center" : "left",
        alignItems: mobile ? "center" : undefined,
      }}
    >
      <Mobile>
        <Avatar
          alt="Email"
          color="warning"
          sx={(theme) => ({
            position: "relative",
            border: "none",
            outline: `2px solid ${theme.palette.warning[500]}`,
            boxShadow: `0 0 40px 5px rgba(${theme.palette.warning.mainChannel} / 0.4)`,
            overflow: "visible",
            marginTop: "3rem",
            "&::before": {
              content: '""',
              position: "absolute",
              top: "-5rem",
              height: "5rem",
              width: "2px",
              background: `linear-gradient(to bottom, transparent, ${theme.palette.warning[400]})`,
            },
          })}
        >
          <FiMail />
        </Avatar>
      </Mobile>
      <Typography level="h2" sx={{ position: "relative" }} id="contact">
        <Default>
          <Avatar
            alt="Email"
            color="warning"
            sx={(theme) => ({
              position: "absolute",
              left: "-49px",
              top: "0",
              transform: "translateX(-50%)",
              border: "none",
              outline: `2px solid ${theme.palette.warning[500]}`,
              boxShadow: `0 0 40px 5px rgba(${theme.palette.warning.mainChannel} / 0.4)`,
            })}
          >
            <FiMail />
          </Avatar>
        </Default>
        Get{" "}
        <Typography color="warning" fontWeight="xl">
          in touch
        </Typography>
      </Typography>

      <Typography
        level="h5"
        textColor="text.tertiary"
        sx={{
          maxWidth: "500px",
        }}
      >
        Feel free to{" "}
        <Typography textColor="text.primary">contact me</Typography> if you have
        any questions or suggestions. I am always open to new{" "}
        <Typography textColor="text.primary">
          ideas and opportunities
        </Typography>
        .
      </Typography>

      <LinkCarousel
        repeat={4}
        links={[
          {
            url: `mailto:${details.contact.email}`,
            icon: <FiMail />,
            title: "Email",
            color: "#ea4335",
          },
          {
            url: `tel:${details.contact.phone}`,
            icon: <FiPhone />,
            title: "Phone",
            color: "#4285f4",
          },
          {
            url: details.contact.linkedin,
            icon: <FaLinkedin />,
            title: "LinkedIn",
            color: "#0a66c2",
          },
          {
            url: details.contact.github,
            icon: <FaGithub />,
            title: "GitHub",
            color: "#E6EDF3",
          },
          {
            url: details.contact.gitlab,
            icon: <FaGitlab />,
            title: "GitLab",
            color: "#fc6d26",
          },
          {
            url: details.contact.deviantart,
            icon: <FaDeviantart />,
            title: "DeviantArt",
            color: "#00E59B",
          },
          {
            url: details.contact.researchgate,
            icon: <SiResearchgate />,
            title: "ResearchGate",
            color: "#1fada2",
          },
        ]}
      />
    </Stack>
  );
}
