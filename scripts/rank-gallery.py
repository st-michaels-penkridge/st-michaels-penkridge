#!/usr/bin/env python3
"""Assign display rank to gallery photos (higher = shown first)."""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "images", "manifest.json")


def score(caption: str, tag: str) -> int:
    c = caption.lower()
    if tag == "local":
        return max(1, min(35, 20))

    s = 45

    boosts = [
        (r"penkridge \(1\)|penkridge \(2\)|penkridge \(3\)", 38),
        (r"^st michael'?s church, penkridge$", 35),
        (r"church of st\. michael", 32),
        (r"all angels'? church, penkridge", 30),
        (r"from the churchyard|churchyard - geograph", 28),
        (r"west tower 01", 26),
        (r"high altar|the nave", 30),
        (r"chancel gates and organ", 28),
        (r"historic high", 20),
        (r"^the tower of st michael", 24),
        (r"graveyard|churchyard", 18),
        (r"gargoyle", 16),
        (r"east window exterior|west window exterior", 14),
    ]
    for pat, pts in boosts:
        if re.search(pat, c):
            s += pts

    if tag == "exterior":
        s += 8
    elif tag == "churchyard":
        s += 4

    penalties = [
        (r"\barms\b", 50),
        (r"inscription", 40),
        (r"ordnance survey|peal board|\bbolt\b", 45),
        (r"detail \(1\)|detail \(2\)|detail \(3\)", 35),
        (r"memorial tablet|tablet", 22),
        (r"hyacinthe", 18),
    ]
    for pat, pts in penalties:
        if re.search(pat, c):
            s -= pts

    if "edward littleton 1558" in c and "arms" not in c:
        s += 10
    if "monument" in c and "detail" not in c:
        s += 5

    return max(1, min(100, s))


def main():
    with open(MANIFEST, encoding="utf-8") as f:
        items = json.load(f)
    for item in items:
        item["rank"] = score(item.get("caption", ""), item.get("tag", "exterior"))
    items.sort(key=lambda x: (-x["rank"], x["caption"].lower()))
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)
    print(f"Ranked {len(items)} photos")


if __name__ == "__main__":
    main()
