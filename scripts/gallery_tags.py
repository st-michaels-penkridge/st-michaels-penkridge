#!/usr/bin/env python3
"""Classify gallery photos by caption (exterior / churchyard / interior / details)."""
import json
import os
import re
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "images", "manifest.json")


def is_local_area(caption: str) -> bool:
    c = caption.lower().strip()
    c = re.sub(r"\.(jpe?g|png|webp)$", "", c)
    if re.search(
        r"st\.?\s*michael|all angels|church of st|littleton|memorial|monument| tomb",
        c,
    ):
        if not re.search(r"village green", c):
            return False
    local_markers = (
        r"village green",
        r"roscoe gjr",
        r"market street",
        r"market place",
        r"old market",
        r"white hart",
        r"star inn",
        r"almshouse",
        r"canal at penkridge|canal in penkridge|narrowboat",
        r"penkridge station|penkridge railway",
        r"vale gardens",
        r"birch trees in the park",
        r"valley of the penk",
        r"deanery",
    )
    return any(re.search(p, c) for p in local_markers)


def classify(caption: str) -> str:
    c = caption.lower().strip()
    c = re.sub(r"\.(jpe?g|png|webp)$", "", c)

    if is_local_area(caption):
        return "local"

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
    ) or ("tower 01" in c):
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
    print(Counter(i["tag"] for i in items))


if __name__ == "__main__":
    main()
