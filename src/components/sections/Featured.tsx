import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  ColorPaletteProp,
  Divider,
  Stack,
  Typography,
} from "@mui/joy";
import React, { useEffect, useState } from "react";
import { BsJournalCode } from "react-icons/bs";
import { FaCodeBranch, FaGithub, FaStar } from "react-icons/fa";
import getProjects from "@/utils/Api";
import { Parallax } from "react-scroll-parallax";
import { FiArrowRight, FiCode, FiExternalLink } from "react-icons/fi";
import { RiBracesLine } from "react-icons/ri";
import { Project, rank } from "@/assets/Projects";
import { Link } from "react-router-dom";
import { MdErrorOutline } from "react-icons/md";
import { Default, Mobile, useMobileMode } from "@/components//Responsive";

/**
 * Beautifies a string
 * @param str The string to beautify
 * @returns The beautified string
 */
export function beautify(str: string) {
  return str
    .replace(/-/g, " ")
    .replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
}

function ProjectCard({
  project,
  color = "info",
}: {
  project: Project;
  color?: ColorPaletteProp;
}) {
  const mobile = useMobileMode();

  return (
    <Card
      component={Stack}
      variant="outlined"
      gap={2}
      p={3}
      justifyContent="space-between"
      sx={(theme) => ({
        ...(mobile && {
          background: "transparent",
          border: "none",
          paddingX: 1,
          paddingY: 0,
        }),
        transition: "all ease .2s",
        boxShadow: "none",
        "&:hover": mobile
          ? {}
          : {
              transform: "translateY(-.6rem)",
              filter: `drop-shadow(0 .6rem 0 ${theme.palette[color].solidBg})`,
              transformOrigin: "bottom left",
              color: theme.palette[color].softColor,
              borderColor: theme.palette[color].solidBg,
              backgroundColor: theme.palette[color].softBg,
              zIndex: 1,
              "&:before": {
                content: '""',
                position: "absolute",
                top: 0,
                right: "100%",
                width: ".6rem",
                height: "100%",
              },
              "&:after": {
                content: '""',
                position: "absolute",
                top: "100%",
                left: 0,
                width: "100%",
                height: ".6rem",
              },
              "& .avatar": {
                borderColor: theme.palette[color].outlinedBorder,
                color: theme.palette[color].solidColor,
                backgroundColor: theme.palette[color].solidBg,
              },
            },
      })}
    >
      <Stack gap={1}>
        <Stack direction="row" alignItems="center" gap={2}>
          <Avatar
            alt={project.title}
            color="neutral"
            variant="outlined"
            className="avatar"
            sx={{
              transition: "all ease .2s",
              borderRadius: "calc(var(--Card-radius) / 1.5)",
            }}
          >
            <FiCode />
          </Avatar>
          <Typography level="h5" textColor="inherit">
            {beautify(project.title)}
          </Typography>
        </Stack>
        <Typography level="body3" color="neutral" startDecorator={<FiCode />}>
          {project.language}
        </Typography>
        <Typography
          level="body2"
          sx={{
            flexGrow: 0,
          }}
        >
          {project.description}
        </Typography>
      </Stack>
      <Stack direction="row" gap={2} justifyContent="space-between">
        <Stack direction="row" gap={2}>
          <Typography level="body2" startDecorator={<FaStar />}>
            {project.interactions?.stars}
          </Typography>
          <Typography level="body2" startDecorator={<FaCodeBranch />}>
            {project.interactions?.forks}
          </Typography>
        </Stack>
        <Stack direction="row" gap={1}>
          <Button
            variant="plain"
            component="a"
            color={color}
            href={project.source}
            target="_blank"
            sx={{
              flexShrink: 0,
            }}
            startDecorator={<RiBracesLine />}
          >
            Code
          </Button>
          {project.demo && (
            <Button
              component="a"
              color={color}
              variant="solid"
              href={project.demo}
              target="_blank"
              startDecorator={<FiExternalLink />}
            >
              Website
            </Button>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

export default function Featured() {
  const mobile = useMobileMode();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    setLoading(true);
    getProjects()
      .then((data) => {
        setProjects(data?.filter((project) => project.platform === "github") || []);
      })
      .catch(() => {
        setError(
          new Error(
            "Failed to load featured projects, our API was unreachable."
          )
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <Stack gap={3} marginBottom={mobile ? "5rem" : 0}>
      <Stack gap={2} alignItems={mobile ? "center" : "flex-start"}>
        <Mobile>
          <Avatar
            alt="Featured"
            color="info"
            sx={(theme) => ({
              position: "relative",
              border: "none",
              outline: `2px solid ${theme.palette.info[500]}`,
              boxShadow: `0 0 40px 5px rgba(${theme.palette.info.mainChannel} / 0.4)`,
              overflow: "visible",
              marginTop: "3rem",
              marginBottom: "1rem",
              "&::before": {
                content: '""',
                position: "absolute",
                top: "-5rem",
                height: "5rem",
                width: "2px",
                background: `linear-gradient(to bottom, transparent, ${theme.palette.info[500]})`,
              },
            })}
          >
            <BsJournalCode />
          </Avatar>
        </Mobile>
        <Typography
          level="h2"
          sx={{ position: "relative", textAlign: mobile ? "center" : "left" }}
          id="featured"
        >
          <Default>
            <Avatar
              alt="Featured"
              color="info"
              sx={(theme) => ({
                position: "absolute",
                left: "-49px",
                top: "0",
                transform: "translateX(-50%)",
                border: "none",
                outline: `2px solid ${theme.palette.info[500]}`,
                boxShadow: `0 0 40px 5px rgba(${theme.palette.info.mainChannel} / 0.4)`,
              })}
            >
              <BsJournalCode />
            </Avatar>
          </Default>
          Featured{" "}
          <Typography
            color="info"
            alignItems="center"
            fontWeight="xl"
            endDecorator={
              <Default>
                <Chip
                  variant="soft"
                  color="info"
                  startDecorator={
                    <Avatar alt="GitHub" color="info" variant="outlined">
                      <FaGithub size="1rem" />
                    </Avatar>
                  }
                >
                  {`${projects.length > 0 ? projects.length : "No"} repositor${
                    projects.length === 1 ? "y" : "ies"
                  }`}
                </Chip>
              </Default>
            }
          >
            Projects
          </Typography>
        </Typography>
        <Mobile>
          <Chip
            variant="soft"
            color="info"
            startDecorator={
              <Avatar alt="GitHub" color="info" variant="outlined">
                <FaGithub size="1rem" />
              </Avatar>
            }
          >
            {projects.length} repositories
          </Chip>
        </Mobile>
      </Stack>
      <Parallax
        opacity={[0, 1]}
        easing="easeOutBack"
        disabled={mobile}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <Box
          component={Stack}
          gap={3}
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: mobile ? "column" : "row",
            flexWrap: "wrap",
            "& > *": {
              flexGrow: 1,
              width: mobile ? "auto" : "min(300px, 100%)",
            },
          }}
        >
          {error && !loading && (
            <Alert
              color="info"
              startDecorator={<MdErrorOutline size="1.1rem" />}
              endDecorator={
                <Button
                  size="sm"
                  variant="plain"
                  color="info"
                  component="a"
                  href="https://stats.uptimerobot.com/y3hLa5ZEeK"
                  target="_blank"
                >
                  Check API status
                </Button>
              }
              sx={{
                gap: 0.5,
                padding: ".3rem .3rem .3rem 1rem",
                maxWidth: "100%",
              }}
            >
              <span
                style={{
                  flex: "1 1 100%",
                  minWidth: 0,
                }}
              >
                <Typography
                  textColor="inherit"
                  fontSize="inherit"
                  fontWeight="inherit"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                  }}
                >
                  {error.message}
                </Typography>
              </span>
            </Alert>
          )}
          {loading ? (
            <Stack
              direction={mobile ? "column" : "row"}
              justifyContent="center"
              alignItems="center"
              gap={mobile ? 3 : 5}
              padding={mobile ? "2rem 3rem" : 5}
            >
              <CircularProgress size="md" variant="plain" color="info" />
              <Stack
                direction="column"
                gap={0.5}
                maxWidth="25rem"
                textAlign={mobile ? "center" : "left"}
              >
                <Typography level="h3" textColor="info.200">
                  Loading projects
                </Typography>
                <Typography level="body2" textColor="info.300">
                  Fetching the latest projects from GitHub, please wait.
                </Typography>
              </Stack>
            </Stack>
          ) : (
            <>
              {projects
                .sort((a, b) => rank(b, projects) - rank(a, projects))
                .slice(0, 6)
                .map((project, index) => (
                  <React.Fragment key={project.title}>
                    <ProjectCard project={project} />
                    {mobile && index < projects.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
            </>
          )}
        </Box>
        <Divider />
        <Card
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            flexWrap: mobile ? "wrap" : "nowrap",
            gap: mobile ? "2rem" : "1.5rem",
            alignItems: mobile ? "center" : "start",
            boxShadow: "none",
            overflow: "hidden",
            borderRadius: 0,
            background: "transparent",
            padding: mobile ? ".5rem" : "0",
          }}
        >
          <Stack
            gap={mobile ? 1 : 0.5}
            alignItems={mobile ? "center" : "start"}
          >
            <Typography
              level="h2"
              fontWeight="200"
              textAlign={mobile ? "center" : "left"}
            >
              Projects &{" "}
              <Typography fontFamily={'"Righteous", sans-serif'}>
                Experiments
              </Typography>
            </Typography>
            <Typography
              level="body2"
              textColor="text.secondary"
              textAlign={mobile ? "center" : "left"}
            >
              Browse more projects in the dedicated explorer, a centralised hub
              for all my work and experiments.
            </Typography>
          </Stack>
          <Button
            component={Link}
            to="/projects"
            size="lg"
            variant="outlined"
            color="neutral"
            endDecorator={<FiArrowRight />}
            sx={{
              transition: "all ease .2s",
              background: "var(--joy-palette-text-primary)",
              color: "var(--joy-palette-background-level1)",
              borderColor: "var(--joy-palette-text-primary)",
              padding: "1 2",
              whiteSpace: "nowrap",
              width: mobile ? "100%" : "initial",

              "&:hover": {
                background: "var(--joy-palette-background-body)",
                color: "var(--joy-palette-text-primary)",
              },
              "&:active": {
                transform: "scale(.98)",
              },
            }}
          >
            Explore more projects
          </Button>
        </Card>
      </Parallax>
    </Stack>
  );
}
