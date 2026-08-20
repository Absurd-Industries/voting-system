#!/usr/bin/env python3
"""Validate aggregate voting results and generate publishable analysis assets."""

from __future__ import annotations

import argparse
import csv
import json
import sys
import textwrap
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt


class ResultsError(ValueError):
    """Raised when the aggregate results file is internally inconsistent."""


def load_results(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ResultsError(f"results file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ResultsError(f"results file is not valid JSON: {exc}") from exc

    if not isinstance(data, dict):
        raise ResultsError("results file must contain a JSON object")
    return data


def validate_and_rank(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, int], list[dict[str, Any]]]:
    try:
        conference = data["conference"]
        stats = data["stats"]
        talks = data["talks"]
        name = str(conference["name"]).strip()
        votes_per_voter = int(conference["votes_per_voter"])
        ballot_talk_count = int(conference["ballot_talk_count"])
        eligible_voters = int(stats["eligible_voters"])
        participating_voters = int(stats["participating_voters"])
        total_votes = int(stats["total_votes"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ResultsError(f"missing or invalid aggregate field: {exc}") from exc

    if not name:
        raise ResultsError("conference.name must not be empty")
    if votes_per_voter < 1:
        raise ResultsError("conference.votes_per_voter must be at least 1")
    if not isinstance(talks, list) or not talks:
        raise ResultsError("talks must be a non-empty list")
    if ballot_talk_count != len(talks):
        raise ResultsError(
            f"conference.ballot_talk_count is {ballot_talk_count} but the file contains {len(talks)} talks"
        )
    if not 0 <= participating_voters <= eligible_voters:
        raise ResultsError("participating voters must be between 0 and eligible voters")

    normalized_talks = []
    seen_titles = set()
    for index, talk in enumerate(talks, start=1):
        if not isinstance(talk, dict):
            raise ResultsError(f"talk {index} must be an object")
        try:
            title = str(talk["title"]).strip()
            presenter_name = str(talk["presenter_name"]).strip()
            vote_count = int(talk["vote_count"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ResultsError(f"talk {index} has a missing or invalid field: {exc}") from exc
        if not title:
            raise ResultsError(f"talk {index} has an empty title")
        if title.casefold() in seen_titles:
            raise ResultsError(f"duplicate talk title: {title}")
        if vote_count < 0:
            raise ResultsError(f"vote count cannot be negative: {title}")
        seen_titles.add(title.casefold())
        normalized_talks.append(
            {
                "title": title,
                "presenter_name": presenter_name,
                "vote_count": vote_count,
            }
        )

    counted_votes = sum(talk["vote_count"] for talk in normalized_talks)
    if total_votes != counted_votes:
        raise ResultsError(
            f"stats.total_votes is {total_votes} but talk vote counts add up to {counted_votes}"
        )
    vote_capacity = participating_voters * votes_per_voter
    if total_votes > vote_capacity:
        raise ResultsError(
            f"{total_votes} selections exceed the maximum possible {vote_capacity} for participating voters"
        )

    normalized_talks.sort(key=lambda talk: (-talk["vote_count"], talk["title"].casefold()))
    previous_votes = None
    previous_rank = 0
    for position, talk in enumerate(normalized_talks, start=1):
        if talk["vote_count"] != previous_votes:
            previous_rank = position
        talk["rank"] = previous_rank
        previous_votes = talk["vote_count"]

    clean_conference = {
        "name": name,
        "votes_per_voter": votes_per_voter,
        "ballot_talk_count": ballot_talk_count,
    }
    clean_stats = {
        "eligible_voters": eligible_voters,
        "participating_voters": participating_voters,
        "total_votes": total_votes,
    }
    return clean_conference, clean_stats, normalized_talks


def format_report(conference: dict[str, Any], stats: dict[str, int], talks: list[dict[str, Any]]) -> str:
    average = stats["total_votes"] / stats["participating_voters"] if stats["participating_voters"] else 0
    lines = [
        conference["name"],
        "=" * len(conference["name"]),
        "",
        f"{stats['participating_voters']} participating voters cast {stats['total_votes']} selections",
        f"{stats['eligible_voters']} registered voters; up to {conference['votes_per_voter']} selections each",
        f"{average:.2f} selections per participating voter",
        "",
        "Rank Votes  Proposal",
        "---- -----  --------",
    ]
    lines.extend(
        f"{talk['rank']:>2} {talk['vote_count']:>3}  {talk['title']}" for talk in talks
    )
    return "\n".join(lines)


def write_csv(path: Path, talks: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=("rank", "title", "presenter_name", "vote_count"),
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(talks)


def wrapped_title(title: str, width: int = 52) -> str:
    return "\n".join(textwrap.wrap(title, width=width, break_long_words=False))


def draw_results_chart(
    talks: list[dict[str, Any]],
    output_path: Path,
    title: str,
    *,
    compact: bool,
    dark: bool,
) -> None:
    palette = (
        {
            "background": "#18181b",
            "foreground": "#e4e4e7",
            "muted": "#a1a1aa",
            "grid": "#3f3f46",
            "highlight": "#2dd4bf",
            "bar": "#52525b",
        }
        if dark
        else {
            "background": "#ffffff",
            "foreground": "#27272a",
            "muted": "#52525b",
            "grid": "#e4e4e7",
            "highlight": "#14b8a6",
            "bar": "#71717a",
        }
    )
    labels = [wrapped_title(talk["title"], 46 if compact else 58) for talk in talks]
    values = [talk["vote_count"] for talk in talks]
    height = max(7, len(talks) * (0.58 if compact else 0.48) + 2.2)
    fig, ax = plt.subplots(figsize=(15, height))
    colors = [palette["highlight"] if talk["rank"] <= 6 else palette["bar"] for talk in talks]
    bars = ax.barh(labels, values, color=colors)
    ax.invert_yaxis()
    ax.set_title(
        title,
        loc="left",
        fontsize=20,
        fontweight="bold",
        pad=18,
        color=palette["foreground"],
    )
    ax.set_xlabel("Community votes", color=palette["muted"])
    ax.set_xlim(0, max(values) + 2.5)
    ax.xaxis.grid(True, color=palette["grid"], linewidth=0.8)
    ax.set_axisbelow(True)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.spines["bottom"].set_color(palette["grid"])
    ax.tick_params(
        axis="y",
        length=0,
        labelsize=10 if compact else 9,
        colors=palette["foreground"],
    )
    ax.tick_params(axis="x", colors=palette["muted"])
    ax.bar_label(
        bars,
        labels=[str(value) for value in values],
        padding=5,
        fontsize=10,
        fontweight="bold",
        color=palette["foreground"],
    )
    fig.patch.set_facecolor(palette["background"])
    ax.set_facecolor(palette["background"])
    fig.tight_layout()
    fig.savefig(output_path, dpi=180, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)


def draw_terminal_output(report: str, output_path: Path, line_limit: int = 20) -> None:
    report_lines = report.splitlines()
    heading_lines = report_lines[:9]
    ranking_lines = report_lines[9 : 9 + line_limit]
    shown_report = "\n".join([*heading_lines, *ranking_lines])
    if len(report_lines) > 9 + line_limit:
        shown_report += f"\n... {len(report_lines) - 9 - line_limit} more proposals"

    line_count = len(shown_report.splitlines())
    fig, ax = plt.subplots(figsize=(15, max(7, line_count * 0.42 + 1.2)))
    fig.patch.set_facecolor("#161b22")
    ax.set_facecolor("#161b22")
    ax.axis("off")
    ax.text(
        0.035,
        0.96,
        "$ python3 analyze_results.py results-2026.json",
        transform=ax.transAxes,
        va="top",
        ha="left",
        color="#2dd4bf",
        family="monospace",
        fontsize=11.5,
        linespacing=1.35,
    )
    ax.text(
        0.035,
        0.89,
        shown_report,
        transform=ax.transAxes,
        va="top",
        ha="left",
        color="#e4e4e7",
        family="monospace",
        fontsize=11.5,
        linespacing=1.35,
    )
    fig.savefig(output_path, dpi=180, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate aggregate CFP results and generate charts, CSV, and terminal output."
    )
    parser.add_argument("results", type=Path, help="privacy-safe aggregate results JSON")
    parser.add_argument("--output-dir", type=Path, default=Path("generated"))
    parser.add_argument("--top", type=int, default=10, help="number of proposals in the focused chart")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        data = load_results(args.results)
        conference, stats, talks = validate_and_rank(data)
        if args.top < 1:
            raise ResultsError("--top must be at least 1")
    except ResultsError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    report = format_report(conference, stats, talks)
    print(report)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(args.output_dir / "talk_vote_counts.csv", talks)
    draw_results_chart(
        talks,
        args.output_dir / "talk_votes_all_chart.png",
        f"All proposals — {conference['name']}",
        compact=False,
        dark=False,
    )
    draw_results_chart(
        talks,
        args.output_dir / "talk_votes_all_chart_dark.png",
        f"All proposals — {conference['name']}",
        compact=False,
        dark=True,
    )
    draw_results_chart(
        talks[: args.top],
        args.output_dir / "talk_votes_top_chart.png",
        f"Top {min(args.top, len(talks))} proposals — {conference['name']}",
        compact=True,
        dark=False,
    )
    draw_results_chart(
        talks[: args.top],
        args.output_dir / "talk_votes_top_chart_dark.png",
        f"Top {min(args.top, len(talks))} proposals — {conference['name']}",
        compact=True,
        dark=True,
    )
    draw_terminal_output(report, args.output_dir / "terminal_output.png")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
