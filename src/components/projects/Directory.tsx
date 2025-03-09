import {
  Input,
  Select,
  Option,
  Stack,
  IconButton,
  Button,
  Typography,
  Avatar,
  Box,
  Divider,
  CircularProgress,
  Chip,
} from "@mui/joy";
import React, { useEffect, useMemo, useState } from "react";
import { IoIosClose, IoIosSearch, IoIosShuffle } from "react-icons/io";
import {
  Interaction,
  interactionDetails,
  Platform,
  platformDetails,
  Project,
  rank,
} from "@/assets/Projects";
import getProjects from "@/utils/Api";
import moment from "moment";
import { FiCode, FiFile, FiPlay } from "react-icons/fi";
import { CiSearch, CiWifiOff } from "react-icons/ci";
import { useMobileMode, useTabletMode } from "@/components/Responsive";
import { GoDownload } from "react-icons/go";
import { useSearchParams } from "react-router-dom";

function Message({
  children,
  title,
  subtitle,
}: {
  children: JSX.Element;
  title: string;
  subtitle: string;
}) {
  const mobile = useMobileMode();

  return (
    <Stack
      direction="row"
      justifyContent="center"
      alignItems="center"
      flexWrap="wrap"
      gap={mobile ? 3 : 5}
      padding={mobile ? "2rem 3rem" : 15}
      sx={
        mobile
          ? (theme) => ({
              background: theme.palette.background.body,
              width: "100vw",
              marginX: "-1rem",
              zIndex: 1,
            })
          : undefined
      }
    >
      {children}
      <Stack
        direction="column"
        gap={0.5}
        maxWidth="25rem"
        textAlign={mobile ? "center" : "left"}
      >
        <Typography level="h3" fontSize="clamp(1.2rem, 5vw, 1.875rem)">
          {title}
        </Typography>
        <Typography level="body2">{subtitle}</Typography>
      </Stack>
    </Stack>
  );
}

function ProjectCard({
  project,
  open,
  onClick,
}: {
  project: Project;
  open: boolean;
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  const mobile = useMobileMode();

  const footer = useMemo(
    () =>
      `published to ${platformDetails[project.platform].label}${
        project.createdAt ? ` ${moment(project.createdAt).fromNow()}` : ""
      }${
        project.updatedAt
          ? `, updated ${moment(project.updatedAt).fromNow()}`
          : ""
      }`,
    [project]
  );

  return (
    <Stack
      id={project.title}
      direction={mobile ? "column" : "row"}
      padding={2}
      gap={2}
      onClick={() => onClick()}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      className={`${open ? "open" : ""} ${pressed ? "pressed" : ""}`}
      alignItems="stretch"
      flexWrap="wrap"
      sx={(theme) => ({
        willChange: "filter",
        transition: "all ease .2s",
        position: "relative",
        cursor: "pointer",
        borderRadius: "1rem",
        backgroundColor: theme.palette.background.body,
        border: "1px solid transparent",
        overflow: "hidden",
        "&:hover, &.open, &.pressed": {
          zIndex: 1,
          border: `1px solid ${theme.palette.text.primary}`,
          filter: `drop-shadow(0 .4rem 0 ${theme.palette.text.primary})`,
          transform: "translateY(-.4rem)",
          "&:after": {
            content: '""',
            position: "absolute",
            bottom: "-.4rem",
            left: 0,
            width: "100%",
            height: ".4rem",
            backgroundColor: "transparent",
          },
          "& .illustration": {
            opacity: 0.8,
          },

          "& .icon": {
            backgroundColor: theme.palette.text.primary,
            color: theme.palette.background.level1,
          },

          "& + hr": {
            display: "none",
          },
        },
        "&.open": {
          marginY: ".8rem",
        },
        "&.pressed": {
          filter: `drop-shadow(0 .2rem 0 ${theme.palette.text.primary})`,
          transform: "translateY(-.2rem)",
        },
      })}
    >
      <Stack direction={mobile ? "row" : "column"} gap={mobile ? 2 : 1}>
        <Avatar
          component="span"
          className="icon"
          variant="plain"
          size="md"
          sx={{ borderRadius: ".5rem", transition: "all ease .2s", zIndex: 1 }}
        >
          {platformDetails[project.platform].icon({ size: "1.3rem" })}
        </Avatar>
        <Stack
          component="div"
          className={`interactions${open ? " open" : ""}`}
          direction={mobile ? "row" : "column"}
          gap={mobile ? 2 : 1}
          sx={{
            transition: "all ease .4s",
            opacity: 0,
            maxHeight: 0,
            transform: `${
              mobile ? "translateX(-100%)" : "translateY(-100%)"
            } scale(.8)`,
            "&.open": {
              opacity: 1,
              maxHeight: "100vmax",
              transform: `${
                mobile ? "translateX(0)" : "translateY(0)"
              } translateY(0) scale(1)`,
            },
          }}
        >
          {Object.entries(interactionDetails).map(([key, item]) =>
            project.interactions !== undefined &&
            Object.keys(project.interactions).includes(key) ? (
              <Stack
                direction={mobile ? "row" : "column"}
                key={key}
                alignItems="center"
              >
                <Stack
                  direction={mobile ? "row" : "column"}
                  alignItems="center"
                  gap={0.8}
                  sx={{
                    fontSize: mobile ? "1rem" : "0.8rem",
                    padding: ".3rem .1rem",
                    lineHeight: 0.9,
                  }}
                >
                  {item.icon({})}
                  <span style={{ fontSize: "0.9em" }}>
                    {project.interactions[key as Interaction]}
                  </span>
                </Stack>
              </Stack>
            ) : null
          )}
        </Stack>
      </Stack>

      <Stack
        zIndex={1}
        gap={0.5}
        flex={1}
        sx={{
          minWidth: "min(100%, 20rem)",
        }}
      >
        <Typography level="h3" alignItems="baseline">
          {project.title}
          <Typography textColor="text.tertiary" fontWeight="300" marginLeft={1}>
            {platformDetails[project.platform].sublabel.toLocaleLowerCase()}
          </Typography>
        </Typography>
        <Typography
          level="body2"
          sx={{
            flex: 1,
            "& p": {
              margin: 0,
            },
          }}
        >
          <span
            dangerouslySetInnerHTML={{ __html: project.description || "" }}
          />
        </Typography>
        <Typography level="body3" marginTop={1}>
          {project.language ? (
            <>
              <Typography textColor="text.primary">
                {project.language}
              </Typography>
              {" project "}
            </>
          ) : (
            "Project "
          )}
          {footer}
        </Typography>
      </Stack>
      <Stack
        direction="row"
        zIndex={1}
        gap={1}
        alignItems="start"
        marginTop={mobile ? ".5rem" : "initial"}
        justifyContent={mobile ? "end" : "initial"}
        width={mobile ? "100%" : "initial"}
      >
        <Button
          component="a"
          href={project.source}
          target="_blank"
          size={mobile ? "md" : "sm"}
          color="neutral"
          variant="outlined"
          sx={(theme) => ({
            transition: "all ease .2s, height ease .4s",
            borderRadius: ".5rem",
            width: "fit-content",
            flexShrink: 0,
            padding: "1 2",
            background: theme.palette.background.body,

            "&:hover": {
              background: theme.palette.text.primary,
              color: theme.palette.background.level1,
              borderColor: theme.palette.text.primary,
            },
            "&:active": {
              transform: "scale(.98)",
            },
          })}
          startDecorator={
            project.language !== undefined ? <FiCode /> : <FiFile />
          }
        >
          {project.language !== undefined ? "Explore source" : "Show project"}
        </Button>
        {project.demo && (
          <Button
            component="a"
            href={project.demo}
            target="_blank"
            size={mobile ? "md" : "sm"}
            color="neutral"
            variant="outlined"
            sx={(theme) => ({
              transition: "all ease .2s",
              borderRadius: ".5rem",
              width: "fit-content",
              flexShrink: 0,
              padding: "1 2",

              borderColor: theme.palette.text.primary,
              background: theme.palette.text.primary,
              color: theme.palette.background.level1,
              "&:hover": {
                backgroundColor: theme.palette.background.body,
                color: theme.palette.text.primary,
              },
              "&:active": {
                transform: "scale(.98)",
              },
            })}
            startDecorator={<FiPlay />}
          >
            Run demo
          </Button>
        )}
      </Stack>
      {project.thumbnail && (
        <Box
          component="img"
          src={project.thumbnail}
          alt={project.title}
          className="illustration"
          sx={{
            transition: "all ease .2s",
            position: "absolute",
            minHeight: "100%",
            minWidth: "61%",
            left: "40%",
            top: "50%",
            WebkitMaskImage:
              "linear-gradient(to left,black 10%,transparent 80%)",
            maskImage: "linear-gradient(to left,black 10%,transparent 80%)",
            opacity: 0,
            filter: "blur(5px)",
            transform: "translateY(-50%)",
          }}
        />
      )}
    </Stack>
  );
}

export default function Directory() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [openProject, setOpenProject] = useState("");

  const mobile = useMobileMode();
  const tablet = useTabletMode();

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [platform, setPlatform] = useState<string | null>(
    searchParams.get("platform") || null
  );

  const [projects, setProjects] = useState([] as Project[]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const [filteredProjects, setFilteredProjects] = useState([] as Project[]);

  useEffect(() => {
    setLoading(true);
    getProjects()
      .then((data) => {
        setProjects(data || []);
      })
      .catch(() => {
        setError(
          new Error(
            "There was an error loading the projects. Please try again later."
          )
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (platform) params.set("platform", platform);
    setSearchParams(params);
  }, [search, platform]);

  // Update the debounced search term
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Filtering
  useEffect(() => {
    setFilteredProjects(
      projects.filter(
        (project) =>
          (platform === null || project.platform === platform) &&
          (debouncedSearch === "" ||
            project.title
              .toLowerCase()
              .includes(debouncedSearch.toLowerCase()) ||
            project.platform
              .toLowerCase()
              .includes(debouncedSearch.toLowerCase()) ||
            project.description
              ?.toLowerCase()
              .includes(debouncedSearch.toLowerCase()) ||
            project.language
              ?.toLowerCase()
              .includes(debouncedSearch.toLowerCase()))
      )
    );

    // If the open project is not in the filtered list, close it
    if (
      openProject !== "" &&
      !projects.find((project) => project.title === openProject)
    ) {
      setOpenProject("");
    }
  }, [projects, debouncedSearch, platform]);

  // Pick a random project from the list and open it, then scroll to it
  const randomize = () => {
    const randomIndex = Math.floor(Math.random() * filteredProjects.length);
    const randomProject = filteredProjects[randomIndex];
    setOpenProject(randomProject.title);
    document.getElementById(randomProject.title)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const focusInput = () => {
    const inputElement = document.getElementById("search");
    if (inputElement) {
      const { top } = inputElement.getBoundingClientRect();
      window.scrollTo({
        top: top - 16,
        behavior: "smooth",
      });
    }
  };

  // When F is pressed, focus the search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f") {
        e.preventDefault();
        document.getElementById("search")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Stack paddingY={1} width="100%">
      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Input
          size="lg"
          id="search"
          placeholder={`Search ${filteredProjects.length} project${
            filteredProjects.length === 1 ? "" : "s"
          }`}
          variant="outlined"
          value={search}
          className={debouncedSearch !== search ? "loading" : ""}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={mobile ? focusInput : () => {}}
          startDecorator={
            debouncedSearch !== search ? (
              <CircularProgress
                size="sm"
                color="neutral"
                variant="soft"
                sx={{
                  margin: "-4px",
                  "& circle": {
                    transition: "all ease .05s",
                  },
                }}
              />
            ) : (
              <IoIosSearch />
            )
          }
          endDecorator={
            search !== "" && (
              <IconButton
                variant="plain"
                color="neutral"
                sx={{ fontSize: "1.5rem" }}
                onClick={() => setSearch("")}
              >
                <IoIosClose />
              </IconButton>
            )
          }
          sx={(theme) => ({
            transition: "all ease .2s",
            width: mobile || tablet ? "100%" : "min(100%, 30rem)",
            cursor: "pointer",
            borderRadius: "0",
            outline: "none",
            backgroundColor: theme.palette.background.body,
            "--Input-focusedHighlight": theme.palette.text.secondary,

            "&:before": {
              transition: "all ease .2s",
            },

            "&:has(:focus), &.loading": {
              borderRadius:
                mobile || tablet ? "100vmax" : "100vmax 0 0 100vmax",
            },
          })}
        />
        <Select
          placeholder="Filter by platform"
          color="neutral"
          variant="outlined"
          sx={(theme) => ({
            transition: "all ease .2s",
            borderRadius: "0",
            flex: mobile || tablet ? 1 : "initial",
            backgroundColor: theme.palette.background.body,
            width: "12rem",
            "& + ul": {
              borderRadius: "0",
              padding: 0,
            },
          })}
          value={platform}
          onChange={(_, newValue) => setPlatform(newValue)}
          endDecorator={
            platform !== null && (
              <IconButton
                variant="plain"
                color="neutral"
                sx={{ fontSize: "1.5rem" }}
                onClick={() => setPlatform(null)}
              >
                <IoIosClose />
              </IconButton>
            )
          }
          indicator={platform !== null ? null : undefined}
          renderValue={(option) => {
            const details = platformDetails[option?.value as Platform];
            return (
              option &&
              details && (
                <Stack direction="row" gap={1} alignItems="center">
                  <details.icon />
                  {option.label}
                </Stack>
              )
            );
          }}
        >
          {Object.entries(platformDetails).map(([key, item]) => {
            const selected = platform === key;
            const occurrences = filteredProjects.filter(
              (project) => project.platform === key
            ).length;
            return (
              <Option
                key={key}
                color="neutral"
                component={Stack}
                label={item.label}
                value={key}
                direction="row"
                disabled={occurrences === 0}
                gap={1}
              >
                <item.icon />
                <Typography flex="1" textColor="inherit">
                  {item.label}
                </Typography>
                <Chip
                  size="sm"
                  variant={selected ? "solid" : "soft"}
                  color="neutral"
                  disabled={occurrences === 0}
                >
                  {occurrences}
                </Chip>
              </Option>
            );
          })}
        </Select>
        <Button
          size="lg"
          variant="outlined"
          color="neutral"
          startDecorator={<IoIosShuffle style={{ fontSize: "1.5rem" }} />}
          onClick={randomize}
          sx={(theme) => ({
            transition: "all ease .2s",
            position: "relative",
            borderRadius: "0",
            width: "fit-content",
            flexShrink: 0,
            paddingInline: "1rem",

            borderColor: theme.palette.text.primary,
            background: theme.palette.text.primary,
            color: theme.palette.background.level1,
            "& > span > svg": {
              transition: "all ease .2s",
            },
            "&:hover": {
              backgroundColor: theme.palette.background.body,
              color: theme.palette.text.primary,
              "& > span > svg": {
                transform: "rotate3d(1, 0, 0, 540deg) scale(1.2)",
              },
            },
            "&:active": {
              transform: "scale(.98)",
            },
          })}
        >
          Randomize
        </Button>
      </Stack>
      <Stack paddingBlockStart={4}>
        {loading ? (
          <Message
            title="Working on it..."
            subtitle="We are fetching the projects for you. This should only take a few seconds."
          >
            <CircularProgress size="lg" color="neutral" variant="outlined">
              <GoDownload size="1.5rem" />
            </CircularProgress>
          </Message>
        ) : (
          filteredProjects
            .sort(
              (a, b) => rank(b, filteredProjects) - rank(a, filteredProjects)
            )
            .map((project, index) => (
              <React.Fragment
                key={`${project.platform}-${project.title}-${project.source}`}
              >
                <ProjectCard
                  project={project}
                  open={openProject === project.title}
                  onClick={() =>
                    openProject === project.title
                      ? setOpenProject("")
                      : setOpenProject(project.title)
                  }
                />
                {index < filteredProjects.length - 1 && (
                  <Divider
                    sx={{
                      "&:has(+ .open)": {
                        display: "none",
                      },
                    }}
                  />
                )}
              </React.Fragment>
            ))
        )}
        {filteredProjects.length === 0 &&
          !loading &&
          debouncedSearch === search && (
            <Message
              title={
                error
                  ? "This usually never happens..."
                  : "Well that's embarrassing..."
              }
              subtitle={
                error
                  ? error.message
                  : "We couldn't find any projects matching your search criteria. Try a different search term or platform."
              }
            >
              {error ? <CiWifiOff size="5rem" /> : <CiSearch size="5rem" />}
            </Message>
          )}
      </Stack>
    </Stack>
  );
}
