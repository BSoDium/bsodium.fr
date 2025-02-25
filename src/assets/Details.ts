import aauMin from "@/assets/icons/aau.min.webp";
import aau from "@/assets/icons/aau.webp";
import enseeihtMin from "@/assets/icons/enseeiht.min.webp";
import enseeiht from "@/assets/icons/enseeiht.webp";
import escapeMin from "@/assets/icons/escape.min.webp";
import escape from "@/assets/icons/escape.webp";
import talentyouMin from "@/assets/icons/talentyou.min.webp";
import talentyou from "@/assets/icons/talentyou.webp";
import kanopMin from "@/assets/icons/kanop.min.webp";
import kanop from "@/assets/icons/kanop.webp";
import lfdcMin from "@/assets/icons/lfdc.min.webp";
import lfdc from "@/assets/icons/lfdc.webp";

const details = {
  name: {
    first: "Elliot",
    last: "Négrel-Jerzy",
    nickname: "BSoDium",
  },
  title: "Software Engineer",
  biography: "Skilled **full-stack developer** with expertise in diverse programming languages and frameworks. Proven ability to deliver impactful projects on GitHub, fostering a **collaborative environment**. Adept at tackling **complex challenges** and thriving in team settings. Seeking to leverage skills in a dynamic role.",
  education: [
    {
      school: "ENSEEIHT",
      url: "https://www.enseeiht.fr/en/index.html",
      icon: enseeiht,
      iconMin: enseeihtMin,
      location: "Toulouse, France",
      degree: "Master's degree in engineering",
      major: "Computer Science and Applied Mathematics",
      start: "Sep 2020",
      end: "May 2023",
    },
    {
      school: "AAU Klagenfurt",
      url: "https://www.aau.at/en/",
      icon: aau,
      iconMin: aauMin,
      location: "Klagenfurt, Austria",
      degree: "Master's degree in computer science",
      major: "Computer Graphics and Vision",
      start: "Sep 2022",
      end: "Mar 2023",
    },
    {
      school: "CPGE Lycée Déodat de Séverac",
      url: "https://dossier.parcoursup.fr/Candidats/public/fiches/afficherFicheFormation?g_ta_cod=4052",
      location: "Toulouse, France",
      degree: "PTSI/PSI* (Bachelor equivalent)",
      major: "Mathematics and Physics",
      start: "Sep 2018",
      end: "Jul 2020",
    },
  ],
  experience: [
    {
      company: "Kanop",
      url: "https://www.kanop.io/",
      icon: kanop,
      iconMin: kanopMin,
      location: "Barcelona, Spain",
      contract: "Full-time",
      position: "Front-end engineer",
      start: "Feb 2025",
      end: "Present",
      description: "Implementing high-performance cartography and data visualization tools for the Kanop SaaS platform.",
      skills: [
        "React",
        "GCP",
        "Framer Motion",
        "Gitlab CI/CD",
        "Agentic AI UI/UX",
      ],
    },
    {
      company: "TalentYou.ai",
      url: "https://talentyou.ai/",
      icon: talentyou,
      iconMin: talentyouMin,
      location: "Barcelona, Spain",
      contract: "Full-time",
      position: "Full-stack engineer",
      start: "Jul 2024",
      end: "Feb 2025",
      description: [
        "Rewrote the entire front-end of the TalentYou platform using React, Redux, and i18n, greatly improving performance and user experience.",
        "Containerized the back-end services using Docker and VS Code Dev Containers, reducing the onboarding time for new developers by up to 70%.",
      ],
      skills: ["React", "REST", "Docker", "Django", "Redux", "i18n"],
    },
    {
      company: "Escape technologies",
      url: "https://www.escape.tech/",
      icon: escape,
      iconMin: escapeMin,
      location: "Paris, France",
      contract: "Full-time",
      position: "Full-stack engineer",
      start: "Nov 2023",
      end: "May 2024",
      description: [
        "Designed and built a Svelte component library based on the latest Material UI guidelines, greatly increasing development speed and design consistency.",
        "Researched and implemented a contrast-aware palette generation algorithm which significantly improved aesthetics and accessibility.",
        "Redesigned the company website to improve SEO and user experience, leading to a 30% increase in traffic and a 20% increase in conversion rate.",
      ],
      skills: ["R&D", "UI/UX", "Svelte", "GraphQL", "NodeJS", "Figma"],
    },
    {
      company: "Kanop",
      url: "https://www.kanop.io/",
      icon: kanop,
      iconMin: kanopMin,
      location: "Paris, France",
      contract: "Freelance & Internship",
      position: "Front-end engineer",
      start: "Jun 2022",
      end: "Sep 2023",
      description: [
        "Pioneered the design and deployment of cutting-edge web applications using React TypeScript, D3.js, and Mapbox GL for advanced mapping and chart visualizations.",
        "Collaborated with data scientists and UX designers to create impactful and user-friendly visualizations and interfaces.",
        "Led major website overhauls improving navigation, aesthetics, and SEO, while ensuring optimal functionality and user experience.",
      ],
      skills: [
        "React",
        "Node JS",
        "DevOps",
        "Mapbox.gl",
        "Material UI",
        "Adobe XD",
      ],
    },
    {
      company: "La Fresque du Climat",
      url: "https://fresqueduclimat.org/",
      icon: lfdc,
      iconMin: lfdcMin,
      location: "Toulouse, France",
      contract: "Volunteering",
      position: "Facilitator",
      start: "Sept 2021",
      end: "Jun 2022",
      description:
        "Facilitated workshops on climate change awareness in high schools and universities.",
      skills: ["Public speaking", "Climate change awareness", "Teamwork"],
    },
  ],
  languages: [
    {
      name: "French",
      level: "C2",
      native: true,
    },
    {
      name: "English",
      level: "C1",
    },
    {
      name: "Spanish",
      level: "C1",
    },
    {
      name: "Polish",
      level: "B2",
    },
    {
      name: "German",
      level: "B1",
    },
  ],
  contact: {
    location: "Barcelona, España",
    email: "contact@bsodium.fr",
    phone: "+33 7 83 79 29 25",
    website: "https://www.bsodium.fr",
    linkedin: "https://www.linkedin.com/in/bsodium/",
    github: "https://www.github.com/bsodium",
    researchgate: "https://www.researchgate.net/profile/Elliot-Negrel-Jerzy",
    gitlab: "https://www.gitlab.com/bsodium",
    deviantart: "https://www.deviantart.com/bsodium",
  },
};

export default details;
