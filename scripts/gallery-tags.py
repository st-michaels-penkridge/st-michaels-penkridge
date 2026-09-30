#!/usr/bin/env python3
"""Classify gallery photos by caption (exterior / churchyard / interior / details)."""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "images", "manifest.json")


def classify(caption: str) -> str:
    c = caption.lower().strip()
    c = re.sub(r"\.(jpe?g|png|webp)$", "", c)

    if any(x in c for x in ("graveyard", "churchyard", "cross in st")):
        return "churchyard"

    if any(
        x in c
        for x in (
            "window exterior",
            "west tower",
            "east window exterior",
            "the tower of",
            "gargoyle",
            "peal board",
            "ordnance survey",
            " bolt ",
        )
    ) or (c.endswith(" tower 01") or "tower 01" in c):
        return "details"

    if any(
        x in c
        for x in (
            "interior",
            " nave",
            "the nave",
            "organ",
            "chancel",
            "altar",
            "pulpit",
            "lavabo",
            "aisle chapel",
            "memorial",
            "monument",
            " tomb",
            "littleton",
            "hatherton",
            "congreve",
            "effigy",
            "font",
            "pew",
            "tablet",
            "inscription",
            "double tomb",
            "high altar",
            "arms",
            "wynnesbury",
            "cockayne",
            "percy memorial",
            "hyacinthe",
        )
    ):
        return "interior"

    return "exterior"


def main():
    with open(MANIFEST, encoding="utf-8") as f:
        items = json.load(f)
    for item in items:
        item["tag"] = classify(item.get("caption", ""))
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)
    from collections import Counter

    print(Counter(i["tag"] for i in items))


if __name__ == "__main__":
    main()
