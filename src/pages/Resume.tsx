import details from "@/assets/Details";
import { Education, Experience } from "@/components/Details";
import Meta from "@/components/Meta";
import { useMobileMode } from "@/components/Responsive";
import Download from "@/components/resume/Download";
import { getMapProvider } from "@/utils/OS";
import { Avatar, Box, Divider, Stack, Typography } from "@mui/joy";
import { marked } from "marked";
import { useMemo } from "react";
import { TbBriefcase, TbLanguage, TbSchool } from "react-icons/tb";

export const languageProficiencyLevels = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;
export type LanguageProficiencyLevel =
  (typeof languageProficiencyLevels)[number];

export const languageProficiencyLabels: Record<
  (typeof languageProficiencyLevels)[number],
  string
> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper Intermediate",
  C1: "Advanced",
  C2: "Proficient",
};

export function Languages() {
  return (
    <Stack direction="row" flexWrap="wrap" gap={3} p={1}>
      {details.languages.map((language, index) => (
        <Stack
          key={`${language.name}-${index}`}
          direction="row"
          gap={1.5}
          alignItems="center"
        >
          <Avatar
            alt={language.name}
            color="danger"
            variant="plain"
            size="md"
            sx={{
              borderRadius: ".5rem",
              fontFamily: '"Rock Salt", cursive',
              color: "rgba(var(--joy-palette-danger-mainChannel))",
            }}
          >
            {language.level}
          </Avatar>
          <Stack>
            <Typography>{language.name}</Typography>
            <Typography level="body3">
              {language.native
                ? "Native Speaker"
                : languageProficiencyLabels[
                    language.level as LanguageProficiencyLevel
                  ]}
            </Typography>
          </Stack>
        </Stack>
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
        title={`Curriculum Vitae • ${details.name.first} ${details.name.last}`}
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
                textTransform="capitalize"
              >
                {details.title}
              </Typography>
              <Typography
                component="div"
                role="textbox"
                level="body2"
                sx={{
                  position: "relative",
                  borderRadius: ".5rem",
                  marginTop: ".4rem",
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
                  {
                    key: "location",
                    label: "Location",
                    linkFactory: (content: string) =>
                      `http://maps.${getMapProvider()}.com/?q=${content}`,
                  },
                  {
                    key: "email",
                    label: "Email",
                    linkFactory: (content: string) => `mailto:${content}`,
                  },
                  {
                    key: "phone",
                    label: "Phone",
                    linkFactory: (content: string) => `tel:${content}`,
                  },
                  {
                    key: "website",
                    label: "Website",
                    linkFactory: (content: string) => content,
                  },
                ].map(({ key, label, linkFactory }) => {
                  const value =
                    details.contact[key as keyof typeof details.contact];
                  return (
                    <Stack key={key}>
                      <Typography
                        level="body2"
                        fontWeight="bold"
                        textTransform="capitalize"
                      >
                        {label}
                      </Typography>
                      {linkFactory ? (
                        <Typography
                          component="a"
                          level="body2"
                          href={linkFactory(value)}
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
                    <Avatar
                      size="sm"
                      alt="Work experience"
                      sx={{
                        borderRadius: ".5rem",
                        height: "1.75rem",
                        width: "1.75rem",
                      }}
                    >
                      <TbBriefcase />
                    </Avatar>
                  }
                  slotProps={{ startDecorator: { sx: { marginRight: 1 } } }}
                >
                  Work experience
                </Typography>
                <Divider
                  sx={{
                    background:
                      "linear-gradient(to right, var(--joy-palette-divider), transparent)",
                  }}
                />
                <Experience truncate />
              </Stack>

              <Stack gap={1}>
                <Typography
                  level="h6"
                  fontWeight="lg"
                  startDecorator={
                    <Avatar
                      size="sm"
                      alt="Education"
                      sx={{
                        borderRadius: ".5rem",
                        height: "1.75rem",
                        width: "1.75rem",
                      }}
                    >
                      <TbSchool />
                    </Avatar>
                  }
                  slotProps={{ startDecorator: { sx: { marginRight: 1 } } }}
                >
                  Education
                </Typography>
                <Divider
                  sx={{
                    background:
                      "linear-gradient(to right, var(--joy-palette-divider), transparent)",
                  }}
                />
                <Stack gap={1}>
                  <Education wrap />
                </Stack>
              </Stack>

              <Stack gap={1}>
                <Typography
                  level="h6"
                  fontWeight="lg"
                  startDecorator={
                    <Avatar
                      size="sm"
                      alt="Languages"
                      sx={{
                        borderRadius: ".5rem",
                        height: "1.75rem",
                        width: "1.75rem",
                      }}
                    >
                      <TbLanguage />
                    </Avatar>
                  }
                  slotProps={{ startDecorator: { sx: { marginRight: 1 } } }}
                >
                  Languages
                </Typography>
                <Divider
                  sx={{
                    background:
                      "linear-gradient(to right, var(--joy-palette-divider), transparent)",
                  }}
                />
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
