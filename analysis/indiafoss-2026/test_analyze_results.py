import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("analyze_results.py")


def fixture(total_votes=12):
    return {
        "conference": {
            "name": "Test Devroom",
            "votes_per_voter": 3,
            "ballot_talk_count": 4,
        },
        "stats": {
            "eligible_voters": 8,
            "participating_voters": 5,
            "total_votes": total_votes,
        },
        "talks": [
            {"title": "Alpha", "presenter_name": "A", "vote_count": 5},
            {"title": "Beta", "presenter_name": "B", "vote_count": 3},
            {"title": "Gamma", "presenter_name": "C", "vote_count": 3},
            {"title": "Delta", "presenter_name": "D", "vote_count": 1},
        ],
    }


class AnalyzeResultsCliTest(unittest.TestCase):
    def run_cli(self, data):
        temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(temp_dir.cleanup)
        root = Path(temp_dir.name)
        input_path = root / "results.json"
        output_dir = root / "generated"
        input_path.write_text(json.dumps(data), encoding="utf-8")

        result = subprocess.run(
            [sys.executable, str(SCRIPT), str(input_path), "--output-dir", str(output_dir)],
            capture_output=True,
            text=True,
        )
        return result, output_dir

    def test_generates_ranked_csv_and_visuals_with_shared_tie_ranks(self):
        result, output_dir = self.run_cli(fixture())

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(" 1   5  Alpha", result.stdout)
        self.assertIn(" 2   3  Beta", result.stdout)
        self.assertIn(" 2   3  Gamma", result.stdout)
        self.assertIn(" 4   1  Delta", result.stdout)
        self.assertIn("5 participating voters cast 12 selections", result.stdout)

        csv_text = (output_dir / "talk_vote_counts.csv").read_text(encoding="utf-8")
        self.assertNotIn(b"\r\n", (output_dir / "talk_vote_counts.csv").read_bytes())
        self.assertEqual(
            csv_text,
            "rank,title,presenter_name,vote_count\n"
            "1,Alpha,A,5\n"
            "2,Beta,B,3\n"
            "2,Gamma,C,3\n"
            "4,Delta,D,1\n",
        )
        for filename in (
            "talk_votes_all_chart.png",
            "talk_votes_top_chart.png",
            "terminal_output.png",
        ):
            path = output_dir / filename
            self.assertTrue(path.exists(), filename)
            self.assertGreater(path.stat().st_size, 1_000, filename)

    def test_rejects_a_total_that_does_not_match_talk_vote_counts(self):
        result, output_dir = self.run_cli(fixture(total_votes=13))

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("stats.total_votes is 13 but talk vote counts add up to 12", result.stderr)
        self.assertFalse(output_dir.exists())


if __name__ == "__main__":
    unittest.main()
