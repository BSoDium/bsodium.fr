import { Avatar, Chip, Stack, Typography } from "@mui/joy";
import { animated, useSpringRef, useTransition } from "@react-spring/web";
import details from "@/assets/Details";
import ProgressiveImage from "@/components/ProgressiveImage";
import moment from "moment";
import React, { useEffect } from "react";
import { BsCode } from "react-icons/bs";
import { FiPackage } from "react-icons/fi";
import { GoOrganization } from "react-icons/go";
import { IoSchoolOutline } from "react-icons/io5";
import { SlWrench } from "react-icons/sl";
import { TbCircleDashed } from "react-icons/tb";
import { Category } from "@/components/sections/Terminal";

export const skillIcons: {
  [key: string]: React.ReactNode;
} = {
  languages: <BsCode />,
  frameworks: <FiPackage />,
  tools: <SlWrench />,
  others: <TbCircleDashed />,
};

export function Education({ wrap }: { wrap?: boolean } = { wrap: false }) {
  return (
    <Stack
      direction={wrap ? "row" : "column"}
      flexWrap="wrap"
      justifyContent="space-between"
      gap={2}
      p={1}
    >
      {details.education.map((item) => (
        <Stack
          direction="row"
          gap={1.5}
          key={`${item.school}-${item.major}-${item.start}-${item.end}`}
        >
          <Avatar
            color="neutral"
            variant="soft"
            size="lg"
            sx={(theme) => ({
              borderRadius: theme.getCssVar("radius-md"),
              border: `1px solid ${theme.getCssVar("palette-divider")}`,
            })}
          >
            {item.icon ? (
              <ProgressiveImage
                src={item.icon}
                placeholder={item.iconMin}
                alt={item.school}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            ) : (
              <IoSchoolOutline />
            )}
          </Avatar>
          <Stack>
            <Typography
              level="body1"
              display="flex"
              alignItems="baseline"
              flexWrap="wrap"
              gap={1}
            >
              {item.url ? (
                <Typography
                  component="a"
                  href={item.url}
                  textColor="inherit"
                  target="_blank"
                  sx={{
                    textDecoration: "none",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  {item.school}
                </Typography>
              ) : (
                item.school
              )}
              <Typography
                level="body2"
                component="span"
                textColor="text.secondary"
              >
                {item.start} - {item.end}
              </Typography>
            </Typography>
            <Typography level="body2">
              {item.degree}
              {" - "}
              {item.major}
            </Typography>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

export function Experience({ truncate = false }: { truncate?: boolean }) {
  return (
    <Stack gap={2} p={1}>
      {details.experience
        .slice(0, truncate ? 4 : details.experience.length)
        .reduce((acc, item) => {
          const lastItem = acc[acc.length - 1];
          if (
            lastItem &&
            lastItem.length &&
            lastItem[0].company === item.company
          ) {
            lastItem.push(item);
            return acc;
          }
          return [...acc, [item]];
        }, [] as (typeof details.experience)[number][][])
        .map((items, index) => {
          const isLast = index === details.experience.length - 1;
          return (
            <Stack
              direction="row"
              gap={1.5}
              key={`${items[0].company}-${Math.random()}}`}
            >
              <Avatar
                color="neutral"
                variant="soft"
                size="lg"
                sx={(theme) => ({
                  borderRadius: theme.getCssVar("radius-md"),
                  border: `1px solid ${theme.getCssVar("palette-divider")}`,
                })}
              >
                {items[0].icon ? (
                  <ProgressiveImage
                    src={items[0].icon}
                    placeholder={items[0].iconMin}
                    alt={items[0].company}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  />
                ) : (
                  <GoOrganization />
                )}
              </Avatar>
              <Stack
                gap={2}
                sx={(theme) => ({
                  position: "relative",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    width: "1px",
                    height: "calc(100% - 3rem - 12px)",
                    background: isLast
                      ? `linear-gradient(to bottom, ${theme.palette.divider}, transparent)`
                      : theme.palette.divider,
                    left: "calc(-1.5rem - 12px)",
                    top: "calc(3rem + 12px)",
                  },
                })}
              >
                {items.map((item, subIndex) => {
                  const startDate = moment(item.start, "MMM YYYY").toDate();
                  const endDate = moment(
                    item.end === "Present" ? new Date(Date.now()) : item.end,
                    "MMM YYYY"
                  ).toDate();
                  const momentDuration = moment.duration(
                    endDate.getTime() - startDate.getTime()
                  );
                  const years = momentDuration.years();
                  const months = momentDuration.months() + 1;
                  const duration = `${
                    years > 0 ? `${years} year${years !== 1 ? "s" : ""} ` : ""
                  }${months} month${months !== 1 ? "s" : ""}`;
                  return (
                    <Stack
                      key={`${item.company}-${item.position}-${item.start}-${item.end}`}
                      gap={0.75}
                    >
                      <Stack gap={0.25}>
                        <Typography
                          level="body1"
                          display="flex"
                          alignItems="baseline"
                          flexWrap="wrap"
                          columnGap={1}
                          rowGap={0.3}
                        >
                          {subIndex === 0 &&
                            (item.url ? (
                              <Typography
                                component="a"
                                href={item.url}
                                textColor="inherit"
                                target="_blank"
                                sx={{
                                  textDecoration: "none",
                                  "&:hover": {
                                    textDecoration: "underline",
                                  },
                                }}
                              >
                                {item.company}
                              </Typography>
                            ) : (
                              item.company
                            ))}
                          {items.length === 1 && (
                            <>
                              <Typography
                                level="body2"
                                component="span"
                                textColor="text.secondary"
                              >
                                {item.start} - {item.end}
                              </Typography>
                              <Typography
                                level="body2"
                                textColor="text.tertiary"
                              >
                                {` (${duration})`}
                              </Typography>
                            </>
                          )}
                        </Typography>
                        <Typography
                          level="body2"
                          display="flex"
                          alignItems="baseline"
                          flexWrap="wrap"
                          columnGap={1}
                          rowGap={0.3}
                        >
                          <Typography fontWeight="lg" textColor="text.primary">
                            {item.position}
                          </Typography>
                          {items.length > 1 ? (
                            <Typography
                              level="body2"
                              component="span"
                              textColor="text.secondary"
                            >
                              {item.start} - {item.end}
                            </Typography>
                          ) : (
                            <Typography
                              level="body2"
                              component="span"
                              textColor="text.secondary"
                            >
                              {" "}
                              {item.contract} - {item.location}
                            </Typography>
                          )}
                        </Typography>
                      </Stack>
                      <Stack gap={0.25}>
                        {items.length > 1 && (
                          <Typography
                            level="body2"
                            textColor="text.secondary"
                            fontWeight="md"
                          >
                            {item.contract} - {item.location}
                          </Typography>
                        )}
                        <Stack
                          direction="row"
                          alignItems="start"
                          flexWrap="wrap"
                          gap={1}
                          paddingY={0.5}
                        >
                          {item.skills.map((skill) => (
                            <Chip
                              variant="outlined"
                              color="neutral"
                              size="sm"
                              key={skill}
                              sx={(theme) => ({
                                borderColor: theme.palette.divider,
                              })}
                            >
                              {skill}
                            </Chip>
                          ))}
                        </Stack>
                        <Typography
                          level="body3"
                          textColor="text.tertiary"
                          component="div"
                        >
                          {typeof item.description === "string"
                            ? item.description
                            : null}
                          {typeof item.description === "object" ? (
                            <Stack>
                              {item.description.map((chunk) => (
                                <Typography key={chunk}>- {chunk}</Typography>
                              ))}
                            </Stack>
                          ) : null}
                        </Typography>
                      </Stack>
                    </Stack>
                  );
                })}
              </Stack>
            </Stack>
          );
        })}
    </Stack>
  );
}

export default function Details({ category }: { category: Category }) {
  const transRef = useSpringRef();
  const container = React.createRef<HTMLDivElement>();

  const transition = useTransition(category, {
    ref: transRef,
    keys: null,
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0, filter: "blur(10px)", position: "absolute" },
  });

  useEffect(() => {
    // scroll to top of the terminal
    container.current?.parentElement?.scrollTo({ top: 0, behavior: "smooth" });
    // start the transition
    transRef.start();
  }, [category]);

  return (
    <Stack direction="column" ref={container}>
      {transition((style, item) => {
        switch (item) {
          case "education":
            return (
              <animated.div style={style}>
                <Education />
              </animated.div>
            );
          case "experience":
            return (
              <animated.div style={style}>
                <Experience />
              </animated.div>
            );
          default:
            return (
              <animated.div style={style}>
                <Stack>
                  The currently selected category is {category} but there is no
                  content for it yet.
                </Stack>
              </animated.div>
            );
        }
      })}
    </Stack>
  );
}
