#!/usr/bin/env python3
"""Download Penkridge town photos (local area gallery) from Wikimedia Commons."""
import hashlib
import json
import os
import re
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "images")
MANIFEST = os.path.join(OUT, "manifest.json")
UA = "StMichaelsPenkridgeGallery/1.0 (local static site)"

# Town and village — not the church building as the main subject
LOCAL_TITLES = [
    "File:Village Green and St. Michael's Church, Penkridge - geograph.org.uk - 858550.jpg",
    "File:Roscoe GJR(1839) p089 - Penkridge.jpg",
    "File:Market Street, Penkridge - geograph.org.uk - 858534.jpg",
    "File:Market Street, Penkridge - geograph.org.uk - 1246548.jpg",
    "File:Seating in Penkridge old market place, Staffordshire - geograph.org.uk - 2792889.jpg",
    "File:The White Hart, Penkridge - geograph.org.uk - 858513.jpg",
    "File:The Star Inn, Market Place, Penkridge - geograph.org.uk - 6865704.jpg",
    "File:Almshouses on New Road, Penkridge - geograph.org.uk - 2862170.jpg",
    "File:Canal at Penkridge, Staffordshire - geograph.org.uk - 2598291.jpg",
    "File:Narrowboats in Penkridge, Staffordshire - geograph.org.uk - 6389774.jpg",
    "File:Penkridge Station - geograph.org.uk - 859617.jpg",
    "File:Penkridge railway station, Staffordshire - geograph.org.uk - 4190877.jpg",
    "File:Along Vale Gardens, Penkridge - geograph.org.uk - 2861961.jpg",
    "File:Birch trees in the park at Penkridge, Staffordshire - geograph.org.uk - 2793301.jpg",
    "File:Across the valley of the Penk towards The Deanery - geograph.org.uk - 2866299.jpg",
]


def api(params):
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(
        {**params, "format": "json"}
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 5:
                time.sleep(4 * (attempt + 1))
                continue
            raise


def caption_from_title(title):
    c = re.sub(r"^File:", "", title)
    c = re.sub(r" - geograph\.org\.uk - \d+", "", c)
    c = re.sub(r" \(geograph \d+\)", "", c)
    return c.replace("_", " ").replace(" ^ ", " & ")


def local_path(title):
    ext = ".jpg"
    return "local-" + hashlib.sha1(title.encode()).hexdigest()[:12] + ext


def download(title, url):
    fname = local_path(title)
    path = os.path.join(OUT, fname)
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return fname
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                body = r.read()
            break
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 4:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    if len(body) < 500:
        return None
    with open(path, "wb") as f:
        f.write(body)
    return fname


def main():
    os.makedirs(OUT, exist_ok=True)
    rows = []
    for i in range(0, len(LOCAL_TITLES), 40):
        batch = LOCAL_TITLES[i : i + 40]
        data = api(
            {
                "action": "query",
                "titles": "|".join(batch),
                "prop": "imageinfo",
                "iiprop": "url",
                "iiurlwidth": "960",
            }
        )
        for page in data["query"]["pages"].values():
            if "missing" in page or "imageinfo" not in page:
                continue
            title = page["title"]
            url = page["imageinfo"][0].get("thumburl") or page["imageinfo"][0]["url"]
            try:
                fname = download(title, url)
            except Exception as e:
                print("skip", title, e)
                time.sleep(2)
                continue
            if not fname:
                continue
            rows.append(
                {
                    "file": f"images/{fname}",
                    "caption": caption_from_title(title),
                    "tag": "local",
                }
            )
            print("ok", fname)
            time.sleep(1.2)

    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            existing = json.load(f)
    else:
        existing = []

    # Drop old mis-tagged local church shots; keep church photos in other tags
    seen_caps = {x["caption"].lower() for x in rows}
    keep = []
    for x in existing:
        if x.get("tag") == "local":
            continue
        if x["caption"].lower().strip() in seen_caps:
            continue
        keep.append(x)

    merged = keep + rows
    # dedupe by caption, prefer local-* file for local tag
    by_cap = {}
    for item in merged:
        key = item["caption"].lower().strip()
        cur = by_cap.get(key)
        if not cur:
            by_cap[key] = item
            continue
        if item.get("tag") == "local" and "local-" in item["file"]:
            by_cap[key] = item

    out = sorted(by_cap.values(), key=lambda x: x["caption"].lower())
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print("local photos", len(rows), "manifest total", len(out))


if __name__ == "__main__":
    main()
