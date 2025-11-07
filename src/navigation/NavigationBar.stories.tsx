import type { Meta, StoryObj } from "@storybook/react-vite";
import { BrowserRouter } from "react-router-dom";
import NavigationBar from "./NavigationBar";
import ThemeProvider from "@/components/ThemeProvider";
import { Box, Typography } from "@mui/joy";
import { Fragment } from "react";

/**
 * Scrollable content component to demonstrate navigation bar scroll behavior
 */
function ScrollableContent({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Box sx={{ padding: 4 }}>
      <Typography level="h1" gutterBottom>
        {title}
      </Typography>
      <Typography>{description}</Typography>
      {/* Add content to enable scrolling */}
      {Array.from({ length: 10 }).map((_, i) => (
        <Fragment key={i}>
          <Typography sx={{ marginTop: 2 }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam nec
            auctor quam. Integer vitae felis lectus. Proin dictum metus nulla,
            in blandit quam maximus at. Phasellus nec tellus ac est viverra
            ultricies. Duis metus sapien, mattis id sollicitudin tempus,
            sodales in odio. Nunc id dolor vel lorem posuere bibendum a vel
            mauris. Morbi eget enim nulla. Maecenas libero libero, ullamcorper
            a euismod condimentum, congue lacinia turpis. Sed semper elit
            bibendum, tempor ipsum sit amet, fringilla nunc. Nam molestie
            tempus ligula non lobortis. Nunc lobortis, nibh id porttitor
            posuere, nisi mauris ultricies metus, nec pretium nibh turpis a
            mi. Nulla tellus lorem, viverra nec porta et, ornare id risus.
          </Typography>
          <Typography sx={{ marginTop: 2 }}>
            Sed in velit at sapien accumsan iaculis. Morbi molestie, mauris ac
            porttitor ullamcorper, augue urna ultricies sem, non tristique
            urna ex eget est. Vestibulum ante ipsum primis in faucibus orci
            luctus et ultrices posuere cubilia curae; In sodales turpis sed
            neque fermentum, quis tristique risus hendrerit. Praesent quis
            justo enim. Suspendisse pulvinar sapien vel convallis convallis.
            Mauris at pulvinar justo. Donec velit lacus, iaculis at feugiat a,
            maximus vel nunc. Vivamus ut molestie dolor. In venenatis ligula
            orci, luctus varius ante vestibulum vitae. Morbi pretium ex nibh,
            sit amet sollicitudin libero laoreet ac. Vestibulum tempus dolor
            est, non viverra sem pulvinar at. Sed eleifend ultrices est a
            tincidunt. Etiam in lacinia purus.
          </Typography>
          <Typography sx={{ marginTop: 2 }}>
            Sed laoreet diam arcu, sit amet varius urna consectetur ut. Nunc
            sed rhoncus mauris. Ut ultricies in metus vitae suscipit. Cras
            ullamcorper velit in justo viverra, sit amet pellentesque velit
            efficitur. Fusce quis feugiat tellus. Integer ullamcorper interdum
            leo sit amet sagittis. Quisque lobortis quam sit amet semper
            dignissim. Suspendisse vitae vulputate urna.
          </Typography>
          <Typography sx={{ marginTop: 2 }}>
            Sed mauris augue, viverra sed nulla quis, semper suscipit metus.
            Integer aliquet ligula id purus congue, at scelerisque dui congue.
            Sed euismod mauris lacus, at rhoncus nunc auctor non. Duis
            elementum libero et augue dictum, et finibus orci faucibus. Etiam
            maximus nisl lectus. Cras sagittis ultricies lectus at
            scelerisque. Suspendisse potenti. Suspendisse suscipit ut tellus
            at sodales. Suspendisse sit amet aliquam lorem. Praesent maximus
            posuere orci. Phasellus sit amet ligula blandit, mollis mi sit
            amet, convallis turpis. Duis finibus neque vitae hendrerit
            hendrerit. Maecenas quis consectetur urna.
          </Typography>
          <Typography sx={{ marginTop: 2 }}>
            Ut ultrices turpis mauris, ac semper ligula scelerisque lobortis.
            Aliquam erat volutpat. Duis lobortis tortor dignissim ex
            tincidunt, a congue mauris volutpat. Aenean efficitur, velit eu
            placerat hendrerit, nunc mauris euismod leo, ut lobortis enim
            dolor molestie felis. Nam scelerisque non mi ac vehicula. Nam
            aliquet vulputate condimentum. Sed ullamcorper neque vel dui
            convallis, nec gravida ligula euismod. Vestibulum at scelerisque
            urna. Sed viverra vitae nulla quis pellentesque. Ut est erat,
            maximus a ipsum vitae, dignissim tincidunt elit.
          </Typography>
        </Fragment>
      ))}
    </Box>
  );
}

const meta: Meta<typeof NavigationBar> = {
  title: "Navigation/NavigationBar",
  component: NavigationBar,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <ThemeProvider>
          <Story />
        </ThemeProvider>
      </BrowserRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NavigationBar>;

export const Default: Story = {
  args: {
    height: 64,
  },
  render: (args) => (
    <NavigationBar {...args}>
      <ScrollableContent
        title="Navigation Bar Demo"
        description="Scroll down to see the navigation bar hide and show behavior."
      />
    </NavigationBar>
  ),
};

export const CustomHeight: Story = {
  args: {
    height: 80,
  },
  render: (args) => (
    <NavigationBar {...args}>
      <ScrollableContent
        title="Custom Height Navigation Bar"
        description="This navigation bar has a custom height of 80px."
      />
    </NavigationBar>
  ),
};
