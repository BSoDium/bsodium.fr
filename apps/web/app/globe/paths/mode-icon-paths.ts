/**
 * The pictures of the modes, as the vector drawings of Lucide (https://lucide.dev, ISC licence: the one icon library of the app, `components/ui/icon.tsx`),
 * one per mode but `unknown`: a plane, a train, a bus, a ship and a pair of footprints. The map's pictures sit in a square badge in the colour of the
 * path (`trail-dots-layer.ts`) and are drawn at full resolution, not on the art grid: the node data is copied here because the engine is framework-free
 * (no React) and draws the SVG itself. 24 x 24 viewBox, 2 px stroke.
 */
export type IconNode = ReadonlyArray<readonly [string, Readonly<Record<string, string>>]>;

export const MODE_ICON_NODES = {
  "flight": {
    "name": "plane",
    "node": [
      [
        "path",
        {
          "d": "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"
        }
      ]
    ]
  },
  "rail": {
    "name": "train-front",
    "node": [
      [
        "path",
        {
          "d": "M8 3.1V7a4 4 0 0 0 8 0V3.1"
        }
      ],
      [
        "path",
        {
          "d": "m9 15-1-1"
        }
      ],
      [
        "path",
        {
          "d": "m15 15 1-1"
        }
      ],
      [
        "path",
        {
          "d": "M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"
        }
      ],
      [
        "path",
        {
          "d": "m8 19-2 3"
        }
      ],
      [
        "path",
        {
          "d": "m16 19 2 3"
        }
      ]
    ]
  },
  "road": {
    "name": "bus",
    "node": [
      [
        "path",
        {
          "d": "M8 6v6"
        }
      ],
      [
        "path",
        {
          "d": "M15 6v6"
        }
      ],
      [
        "path",
        {
          "d": "M2 12h19.6"
        }
      ],
      [
        "path",
        {
          "d": "M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"
        }
      ],
      [
        "circle",
        {
          "cx": "7",
          "cy": "18",
          "r": "2"
        }
      ],
      [
        "path",
        {
          "d": "M9 18h5"
        }
      ],
      [
        "circle",
        {
          "cx": "16",
          "cy": "18",
          "r": "2"
        }
      ]
    ]
  },
  "ferry": {
    "name": "ship",
    "node": [
      [
        "path",
        {
          "d": "M12 2v2"
        }
      ],
      [
        "path",
        {
          "d": "M12 9.189V13"
        }
      ],
      [
        "path",
        {
          "d": "M19 12V6a2 2 0 00-2-2H7a2 2 0 00-2 2v6"
        }
      ],
      [
        "path",
        {
          "d": "M19.38 19A11.6 11.6 0 0021 13l-8.188-3.639a2 2 0 00-1.624 0L3 13.001a11.6 11.6 0 002.81 7.76"
        }
      ],
      [
        "path",
        {
          "d": "M2 20c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"
        }
      ]
    ]
  },
  "walk": {
    "name": "footprints",
    "node": [
      [
        "path",
        {
          "d": "M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"
        }
      ],
      [
        "path",
        {
          "d": "M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"
        }
      ],
      [
        "path",
        {
          "d": "M16 17h4"
        }
      ],
      [
        "path",
        {
          "d": "M4 13h4"
        }
      ]
    ]
  }
} as unknown as Readonly<Record<string, { name: string; node: IconNode }>>;
