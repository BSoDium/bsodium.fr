import { IconType } from 'react-icons';
import {
  IoLogoDeviantart, IoLogoFigma, IoLogoGithub, IoLogoGitlab,
} from 'react-icons/io5';

export const platforms = ['github', 'gitlab', 'figma', 'deviantart'] as const;
export type Platform = (typeof platforms)[number]

export const platformDetails: Record<Platform, { label: string, icon: IconType }> = {
  github: { label: 'GitHub', icon: IoLogoGithub },
  gitlab: { label: 'GitLab', icon: IoLogoGitlab },
  figma: { label: 'Figma', icon: IoLogoFigma },
  deviantart: { label: 'DeviantArt', icon: IoLogoDeviantart },
};

export interface Project {
  title: string;
  description: string;
  thumbnail?: string;
  source: string;
  demo?: string;
  language?: string;
  platform: Platform;
}

const projects: Project[] = [
];

export default projects;
