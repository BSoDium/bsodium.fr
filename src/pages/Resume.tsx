import {
  Avatar,
  Box,
  Chip,
  ColorPaletteProp,
  Divider,
  Stack,
  Typography,
} from "@mui/joy";
import { useMemo } from "react";
import { TbBriefcase, TbLanguage, TbSchool } from "react-icons/tb";
import details from "@/assets/Details";
import { Education, Experience } from "@/components/Details";
import Meta from "@/components/Meta";
import { useMobileMode } from "@/components/Responsive";
import { marked } from "marked";
import Download from "@/components/resume/Download";

export function Languages() {
  const color = (level: string): ColorPaletteProp => {
    switch (level) {
      case "A1":
      case "A2":
      case "B1":
        return "neutral";
      case "B2":
        return "info";
      case "C1":
        return "primary";
      case "C2":
        return "success";
      default:
        return "info";
    }
  };

  return (
    <Stack direction="row" flexWrap="wrap" gap={2} p={1}>
      {details.languages.map((language) => (
        <Chip
          size="lg"
          key={language.name}
          color={color(language.level)}
          variant="outlined"
          startDecorator={
            <Avatar
              alt={language.name}
              color={color(language.level)}
              variant="solid"
              size="sm"
            >
              {language.level}
            </Avatar>
          }
        >
          {`${language.name}${language.native ? " (native)" : ""}`}
        </Chip>
      ))}
    </Stack>
  );
}

export default function Resume() {
  const mobile = useMobileMode();

  /** Parsed HTML content of the biography */
  const parsedBiographyContent = useMemo(
    () =>
      (marked.parse(details.biography) as string)
        .replace(/<p>/g, "")
        .replace(/<\/p>/g, ""),
    []
  );

  return (
    <>
      <Meta
        title={`Curriculum Vitae - ${details.name.first} ${details.name.last}`}
      />
      <Download />
      <Stack
        alignItems="center"
        sx={{
          width: "100vw",
          paddingTop: "var(--nav-safe-area-inset-top)",
          paddingBottom: `calc(var(--nav-safe-area-inset-bottom) + 4rem)`,
          paddingLeft: "var(--nav-safe-area-inset-left)",
        }}
      >
        <Box component="div" maxWidth="65em">
          <Stack
            paddingX={mobile ? 3 : 12}
            paddingY={mobile ? 5 : 6}
            gap={3}
            width="100%"
            height="100%"
          >
            <Stack component="header" gap={0}>
              <Typography level="h2" fontWeight="xl">
                {`${details.name.first} ${details.name.last}`}
              </Typography>
              <Typography
                level="h6"
                fontWeight="lg"
                textColor="text.secondary"
                marginBottom={0.5}
              >
                Software Engineer
              </Typography>
              <Typography
                component="div"
                role="textbox"
                level="body2"
                sx={{
                  position: "relative",
                  borderRadius: ".5rem",
                  marginTop: ".4rem",
                  outline: "1px solid transparent",
                  transition: "all ease .2s",
                  cursor: "pointer",
                }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: parsedBiographyContent,
                  }}
                />
              </Typography>
            </Stack>
            <Box
              component="section"
              sx={{
                gap: 3,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Stack direction="row" flexWrap="wrap" columnGap={2} rowGap={1}>
                {[
                  { key: "location", label: "Location" },
                  { key: "email", label: "Email" },
                  { key: "phone", label: "Phone" },
                  { key: "website", label: "Website" },
                ].map(({ key, label }) => {
                  const value =
                    details.contact[key as keyof typeof details.contact];
                  const isUrl = value.startsWith("http");
                  return (
                    <Stack key={key}>
                      <Typography
                        level="body2"
                        fontWeight="bold"
                        textTransform="capitalize"
                      >
                        {label}
                      </Typography>
                      {isUrl ? (
                        <Typography
                          component="a"
                          level="body2"
                          href={value}
                          target="_blank"
                          sx={{
                            wordBreak: "break-word",
                            textDecoration: "none",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {value}
                        </Typography>
                      ) : (
                        <Typography
                          level="body2"
                          sx={{
                            wordBreak: "break-word",
                          }}
                        >
                          {value}
                        </Typography>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
              <Stack gap={1}>
                <Typography
                  level="h6"
                  fontWeight="lg"
                  startDecorator={
                    <Avatar size="sm" alt="Work experience" sx={{borderRadius: ".5rem", height: "1.75rem", width: "1.75rem"}}>
                      <TbBriefcase />
                    </Avatar>
                  }
                  slotProps={{ startDecorator: { sx:{ marginRight: 1}}}}
                >
                  Work experience
                </Typography>
                <Divider />
                <Experience truncate />
              </Stack>

              <Stack gap={1}>
                <Typography
                  level="h6"
                  fontWeight="lg"
                  startDecorator={
                    <Avatar size="sm" alt="Education" sx={{borderRadius: ".5rem", height: "1.75rem", width: "1.75rem"}}>
                      <TbSchool />
                    </Avatar>
                  }
                  slotProps={{ startDecorator: { sx:{ marginRight: 1}}}}
                >
                  Education
                </Typography>
                <Divider />
                <Stack gap={1}>
                  <Education wrap />
                </Stack>
              </Stack>

              <Stack gap={1}>
                <Typography
                  level="h6"
                  fontWeight="lg"
                  startDecorator={
                    <Avatar size="sm" alt="Languages" sx={{borderRadius: ".5rem", height: "1.75rem", width: "1.75rem"}}>
                      <TbLanguage />
                    </Avatar>
                  }
                  slotProps={{ startDecorator: { sx:{ marginRight: 1}}}}
                >
                  Languages
                </Typography>
                <Divider />
                <Stack gap={1}>
                  <Languages />
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </>
  );
}
