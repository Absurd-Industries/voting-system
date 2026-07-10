// Builds the enriched import CSV from scraped CFP data + a references map.
// Usage: node scripts/make-enriched-csv.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(here, 'cfp-scraped.json'), 'utf8'))

// Reference links per CFP (keyed by the CFP url's trailing id). Reconstructed
// from the full scrape output. Each entry: { title, url }.
const REFS = {
  a70bb4f4q1: [
    { title: 'PCBCUPID — Chennai FOSS 2026', url: 'https://events.pcbcupid.com/foss/chennai-foss-2026/' },
    { title: 'Talk demo (YouTube)', url: 'https://www.youtube.com/watch?v=Max74m77wUk' },
    { title: 'Talk demo (YouTube)', url: 'https://www.youtube.com/watch?v=Cvt5qL3gbGY' },
    { title: 'LinkedIn — Srinivasan M', url: 'https://www.linkedin.com/in/srinivasan-m-421179179/' },
  ],
  '344vqt83ni': [
    { title: 'GitHub — Project OAQ', url: 'https://github.com/Air-Calibre/Project-OAQ-Open-Air-Quality-Sampler' },
    { title: 'Instructables — bhuvanmakes', url: 'https://www.instructables.com/member/bhuvanmakes/' },
  ],
  '0us2gfjiq1': [
    { title: 'IEEE paper', url: 'https://ieeexplore.ieee.org/document/9170633' },
    { title: 'GitHub — README_FOR_FOSS', url: 'https://github.com/ARX-0/README_FOR_FOSS/blob/main/README.md' },
  ],
  ds99k9i693: [
    { title: 'LinkedIn — Vinay Ummadi', url: 'https://linkedin.com/in/vinayummadi' },
    { title: 'LinkedIn — Kiara Bhandari', url: 'https://linkedin.com/in/kiara-bhandari-9919a62b8/' },
  ],
  '7pt1ibasdd': [{ title: 'GitHub — Minnow', url: 'https://github.com/balub/minnow' }],
  '7k7jcbepjo': [{ title: 'onlyscrews.in', url: 'https://onlyscrews.in/' }],
  '1crh77ogup': [
    { title: 'Citizen scientists (opensource.com)', url: 'https://opensource.com/article/18/5/citizen-scientists' },
    { title: 'LinkedIn — Dr. Balaji', url: 'https://www.linkedin.com/in/astrobalaji/' },
  ],
  '1cbj5bhfhf': [
    { title: 'Urumi — Fab Lab Kerala', url: 'https://projects.fablabkerala.in/mtm_projects/urumi/' },
    { title: 'GitLab — aruco-frame', url: 'https://gitlab.cba.mit.edu/quentinbolsee/aruco-frame' },
  ],
  '1bi2qn1ejl': [{ title: 'GitLab — macrobudget', url: 'https://gitlab.com/macrobudget/' }],
  '78dgsbagio': [{ title: 'Ronin Toys', url: 'https://ronintoys.com' }],
  fbip66qvn5: [
    { title: 'GitHub — ble-devwallet', url: 'https://github.com/Zacktrex/ble-devwallet' },
    { title: 'LinkedIn — protic-minz', url: 'https://www.linkedin.com/in/protic-minz' },
  ],
  '9e9bajmm07': [
    { title: 'Tamarind Valley Collective', url: 'https://tvc.farm' },
    { title: 'OpenStreetMap area', url: 'https://www.openstreetmap.org/#map=16/12.35028/77.64544' },
    { title: 'X — @jackerhack', url: 'https://x.com/jackerhack' },
  ],
  '19gqsgi25t': [
    { title: 'Walkthrough (YouTube)', url: 'https://youtu.be/LKz7dkbUMsk' },
    { title: 'LinkedIn — Abhijna Laxmi', url: 'https://www.linkedin.com/in/abhijna-laxmi-659143298' },
  ],
  d66dkv05b8: [{ title: 'Ronin Toys', url: 'https://ronintoys.com' }],
  fn6lfnqdif: [
    { title: 'GitHub — KiCAD-Prism', url: 'https://github.com/krishna-swaroop/KiCAD-Prism' },
    { title: 'GitHub — kicanvas', url: 'https://github.com/theacodes/kicanvas.git' },
    { title: 'GitHub — InteractiveHtmlBom', url: 'https://github.com/openscopeproject/InteractiveHtmlBom' },
  ],
  '7ibeuelafv': [
    { title: 'ayas.fyi — e-paper', url: 'https://www.ayas.fyi/tags/epaper/' },
    { title: 'GitHub — trmnl-firmware', url: 'https://github.com/usetrmnl/trmnl-firmware' },
    { title: 'Soldered Inkplate', url: 'https://soldered.com/collections/inkplate-e-paper-displays' },
  ],
  '8q47utd51e': [
    { title: 'GitHub — HackerFab IITB', url: 'https://github.com/hackerfabiitb' },
    { title: 'Demo (YouTube)', url: 'https://youtu.be/UWHMm4Qjpmo' },
    { title: 'hackerfabiitb.github.io', url: 'https://hackerfabiitb.github.io/' },
  ],
  '4pm3u3odmn': [
    { title: 'GitHub — HackerFab IITB', url: 'https://github.com/hackerfabiitb' },
    { title: 'hackerfabiitb.github.io', url: 'https://hackerfabiitb.github.io/' },
    { title: 'Demo (YouTube)', url: 'https://youtu.be/UWHMm4Qjpmo' },
  ],
  '3nr9benq94': [
    { title: 'Tarab Instruments', url: 'https://tarabinstruments.qaree.bi' },
    { title: 'GitHub — tarab-midi-64', url: 'https://github.com/basisvectors/tarab-midi-64' },
    { title: 'Instagram — tarab_instruments', url: 'https://instagram.com/tarab_instruments' },
  ],
  cgk2r10rmq: [{ title: 'Instagram reel', url: 'https://www.instagram.com/reel/DBS1vdgs-rz/' }],
  '34e5spk31b': [
    { title: 'The OpenROAD Project', url: 'https://theopenroadproject.org' },
    { title: 'GitHub — OpenROAD', url: 'https://github.com/The-OpenROAD-Project/OpenROAD' },
    { title: 'OSHWA', url: 'https://www.oshwa.org' },
    { title: 'KiCad', url: 'https://www.kicad.org' },
  ],
  '3aejg3k2mr': [
    { title: 'GitHub — SentinelBlue', url: 'https://github.com/InvictusRex/SentinelBlue' },
    { title: 'Radxa ROCK 5C', url: 'https://radxa.com/products/rock5/5c/' },
    { title: 'ONNX', url: 'https://onnx.ai/' },
  ],
  '7tvhv9quak': [
    { title: 'GitHub — MITRA', url: 'https://github.com/SaurxbhPatil21/Mitra-' },
    { title: 'GitHub — Health monitoring', url: 'https://github.com/SaurxbhPatil21/Health-monitoring-system' },
    { title: 'Portfolio', url: 'https://saurxbhpatil.netlify.app/' },
  ],
  '32f9jjkob0': [
    { title: 'ZMK docs', url: 'https://zmk.dev/docs' },
    { title: 'GitHub — Corne (crkbd)', url: 'https://github.com/foostan/crkbd' },
    { title: 'QMK docs', url: 'https://docs.qmk.fm/' },
  ],
  '2spauuo7vo': [
    { title: 'Hackaday — JASPER', url: 'https://hackaday.io/project/202421-jasper-vis-nir-spectrometer' },
    { title: 'Spectrometer simulator', url: 'https://checkag-spectrometer-simulator-user-input-wzrswt.streamlit.app/' },
  ],
  fpca2l832k: [
    { title: 'ICFOSS demo (YouTube)', url: 'https://youtu.be/YLm6_L4di8E' },
    { title: 'ICFOSS demo (YouTube)', url: 'https://www.youtube.com/watch?v=ei8-_nG1XXg' },
  ],
  '9m743l8njq': [{ title: 'Smart Panchayats (YouTube)', url: 'https://www.youtube.com/watch?v=pGzpEUUABg0' }],
  anm4n8lt1p: [{ title: 'GitHub — loom', url: 'https://github.com/amandeepsp/loom' }],
  '8sduqa7pg1': [{ title: 'GitHub — nia_flip', url: 'https://github.com/abid-sayyad/nia_flip' }],
  e6lrp8uufr: [
    { title: 'JuliaHub — Dyad', url: 'https://juliahub.com/products/dyad' },
    { title: 'Dyad — creating components', url: 'https://help.juliahub.com/dyad/stable/tutorials/creating-components.html' },
  ],
  '0ak5gg234q': [{ title: 'meetsidekick.tech', url: 'https://meetsidekick.tech' }],
  '99oasc5s6d': [{ title: 'GitHub — shrike', url: 'https://github.com/vicharak-in/shrike' }],
  '13c5qf2b95': [
    { title: 'eSim — FOSSEE', url: 'https://esim.fossee.in' },
    { title: 'GitHub — eSim', url: 'https://github.com/FOSSEE/eSim' },
    { title: 'GitHub — NGHDL', url: 'https://github.com/FOSSEE/NGHDL' },
  ],
}

const HEADERS = [
  'title', 'description', 'duration_minutes', 'presenter_name', 'presenter_bio',
  'presenter_email', 'talk_type', 'cfp_url', 'cfp_content', 'references',
]

const q = (v) => `"${(v == null ? '' : String(v)).replace(/"/g, '""')}"`
const idOf = (url) => url.split('/').filter(Boolean).pop()

const lines = [HEADERS.join(',')]
for (const t of data) {
  const refs = REFS[idOf(t.url)] ?? []
  lines.push([
    q(t.title), q(t.abstract), q(''), q(t.speaker), q(t.bio), q(''),
    q(t.talk_type), q(t.url), q(t.cfp_markdown), q(JSON.stringify(refs)),
  ].join(','))
}

const out = join(here, '..', 'indiafoss-2026-enriched.csv')
writeFileSync(out, lines.join('\n') + '\n', 'utf8')
console.log(`Wrote ${data.length} talks (${Object.keys(REFS).length} with refs) -> ${out}`)
