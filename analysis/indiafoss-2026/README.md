# IndiaFOSS 2026 Open Hardware Devroom results

This directory contains the privacy-safe aggregate election data and the script used to analyze it. It does not contain voter email addresses or individual ballots.

The registered-voter count is frozen at the voting cutoff. Accounts created after voting closed are intentionally excluded, so the participation figures do not drift over time.

## Generate the analysis

From the repository root:

```bash
python3 -m pip install -r analysis/indiafoss-2026/requirements.txt
python3 analysis/indiafoss-2026/analyze_results.py \
  analysis/indiafoss-2026/results-2026.json \
  --output-dir analysis/indiafoss-2026/generated
```

The command validates the aggregate totals, prints the complete ranked result, and creates:

- `talk_vote_counts.csv`
- `talk_votes_all_chart.png`
- `talk_votes_all_chart_dark.png`
- `talk_votes_top_chart.png`
- `talk_votes_top_chart_dark.png`
- `terminal_output.png`

The standard chart files use the light `balubabu.dev` palette. The `_dark` variants use its dark-mode palette. Leading proposals are highlighted with the site's teal accent; the remaining proposals use neutral zinc tones.

Talks with equal vote totals share a rank. The next rank follows competition-ranking rules, so two talks tied at rank 2 are followed by rank 4.

## Run the tests

```bash
python3 -m unittest analysis/indiafoss-2026/test_analyze_results.py -v
```
