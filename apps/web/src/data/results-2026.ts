/**
 * IndiaFOSS 2026 Open Hardware Devroom voting results.
 *
 * Canonical source: analysis/indiafoss-2026/results-2026.json (privacy-safe
 * aggregate data, validated by analysis/indiafoss-2026/analyze_results.py).
 * Narrative numbers (2025 comparison, budget utilisation) come from the
 * published write-up. Keep this file in sync with the JSON if it changes.
 */

export const BALU_POST_URL =
  'https://balubabu.dev/articles/What-the-Community-Chose-OpenHardware-Devroom-at-IndiaFOSS-2026'

export const RESULTS_STATS = {
  proposals: 35,
  proposalsLastYear: 12,
  eligibleVoters: 53,
  participatingVoters: 48,
  totalSelections: 262,
  votesPerVoter: 9,
  /** 262 of the 432 selections available: ~61% of the budget used. */
  budgetUsedPercent: 61,
  /** Top six talks accounted for 34% of selections (62% in 2025) - interest spread widely. */
  topSixSharePercent: 34,
  topSixShareLastYearPercent: 62,
  votingWindow: '31 Jul - 10 Aug',
} as const

/**
 * The curated lineup, in the order of the announcement post. NOT simply the
 * top six by votes: organizers apply judgement after the vote (e.g. one talk
 * per speaker - "Screws" tied 2nd but Balu already presents Minnow).
 * Titles must match the archive/talks table exactly for modal lookup.
 */
export const LINEUP_TITLES = [
  'Minnow: An Open Platform for Ground Swarm Robotics',
  'Build your own open source keyboard with ZMK/QMK',
  'Building Open Source Music Hardware in India - Tarab Instruments',
  'CNC4Everyone - How we built a CNC machine for every classroom, college and makerspace',
  'My zero-to-hero journey deploying a fiber-optic and wireless community mesh',
  'HackerFab IITB: democratizing semiconductor fabrication',
] as const

export interface RankedTalk {
  title: string
  presenter: string
  votes: number
}

/** Full ranked result, all 35 proposals, from results-2026.json. */
export const RANKED_TALKS: RankedTalk[] = [
  { title: 'Minnow: An Open Platform for Ground Swarm Robotics', presenter: 'Balu Babu', votes: 17 },
  { title: 'Build your own open source keyboard with ZMK/QMK', presenter: 'Advait Dhamorikar', votes: 16 },
  { title: 'Holding It Together: A Talk About Screws', presenter: 'Balu Babu', votes: 16 },
  { title: 'Building Open Source Music Hardware in India - Tarab Instruments', presenter: 'Syed Ali', votes: 14 },
  { title: 'CNC4Everyone - How we built a CNC machine for every classroom, college and makerspace', presenter: 'Nikhil Nair, Ashish Joy, Akash Edamana', votes: 14 },
  { title: 'My zero-to-hero journey deploying a fiber-optic and wireless community mesh', presenter: 'Kiran Jonnalagadda', votes: 13 },
  { title: 'Automate your home without selling it to corpos', presenter: 'Venkatesh Chaturvedi', votes: 10 },
  { title: 'Creating a customizable e-paper dashboard', presenter: 'Ayaskant Panigrahi', votes: 10 },
  { title: 'HackerFab IITB: democratizing semiconductor fabrication', presenter: 'Jai Bellare', votes: 10 },
  { title: 'Introduction to Physical AI: Getting Started with Intelligent Robots', presenter: 'Vinay, Kiara Bhandari', votes: 10 },
  { title: 'JASPER: Open-Source Spectroscopy for Everyday Science', presenter: 'Tony Francis', votes: 9 },
  { title: 'KiCAD-Prism: Self-Hosted Hardware Collaboration Workflow for Startups and Student Teams', presenter: 'Krishna Swaroop Dhulipalla', votes: 9 },
  { title: 'Bye bye datasheets, Hello HardwareLib', presenter: 'Nilesh Trivedi', votes: 8 },
  { title: 'Design once, reuse everywhere : Modular Electronics in Practice', presenter: 'Srinivasan M', votes: 8 },
  { title: 'Entering into a world of FPGAs with 4$ fully open source shrike-lite and shrikeFi', presenter: 'Akshar Vastarpara', votes: 8 },
  { title: 'Hackable Cat Toys: What Open Projects Can Learn from Designing for Cats', presenter: 'Ruby Paulson', votes: 8 },
  { title: 'Breaking Into Chip Design: Building a Digital Design Workflow with Open-Source Tools', presenter: 'Abhijna Laxmi', votes: 7 },
  { title: 'React is not just for the Web: Running React on an ESP32 Microcontroller', presenter: 'Pratham Vaidya', votes: 7 },
  { title: 'Why Most Chip Ideas Never Become Products: The Missing Journey from RTL to Reality', presenter: 'AASHISH NIRANJAN BARATHYKANNAN', votes: 7 },
  { title: 'Building an Open Maritime SAR Perception Stack on RK3588 Edge Hardware', presenter: 'Rupankar Majumdar', votes: 6 },
  { title: 'Haptics with Open Source: From Vision to Touch', presenter: 'Ravikanth Dadi', votes: 6 },
  { title: 'Hardware Trojan - Why did it not let me sleep', presenter: 'Rio Roy', votes: 6 },
  { title: 'Lessons Learned from a hardware prototype/weekend project that tried to turn into a product', presenter: 'Souhrud Reddy', votes: 6 },
  { title: 'Nia: My First Badge', presenter: 'Sayyad Abid', votes: 5 },
  { title: 'Building a tiny FPGA accelerator with FOSS tooling', presenter: 'Amandeep Singh', votes: 4 },
  { title: 'Designing an Open-Source Product for Play', presenter: 'Ruby Paulson', votes: 4 },
  { title: 'Dev Wallet: An Open Hardware Wallet Built with Rust', presenter: 'prowork out', votes: 4 },
  { title: 'Migrating from SW to Clinical grade HW: An Open MVDR Beamformer', presenter: 'Athi Ram R S', votes: 4 },
  { title: 'OAQ : An Air Quality Monitoring system made for community', presenter: 'Bhuvan Makes', votes: 4 },
  { title: 'Building at the Edge: Combining Open Hardware and ML in Student Projects', presenter: 'Saurabh Patil', votes: 3 },
  { title: 'Open Hardware for Climate Resilience: From Rain Gauges to Flood Early Warning', presenter: 'Dr. Sunil Thomas Thonikuzhiyil', votes: 3 },
  { title: 'Budget Macropad', presenter: 'Sahaj Sarup', votes: 2 },
  { title: 'eSim: An Open Source EDA with a vision of Simulation to GDS II', presenter: 'Sumanto Kar', votes: 2 },
  { title: 'IoT enabling Smart Panchayats: A Control, Communication, and Computing Ecosystem for Sustainable Development Goals', presenter: 'Shafeek P M, Gopika TG', votes: 2 },
  { title: 'Open Source Scientific Harware for Citizen Science', presenter: 'Balaji Muthusubramanian', votes: 0 },
]

export const isSelected = (title: string): boolean =>
  (LINEUP_TITLES as readonly string[]).includes(title)

/** votes -> map key for archive cards (title-keyed; titles are unique here). */
export const VOTES_BY_TITLE: ReadonlyMap<string, number> = new Map(
  RANKED_TALKS.map((t) => [t.title, t.votes]),
)
