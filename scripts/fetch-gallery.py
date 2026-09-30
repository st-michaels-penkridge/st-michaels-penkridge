#!/usr/bin/env python3
"""Download St Michael's Penkridge photos from Wikimedia Commons into images/."""
import hashlib
import json
import os
import re
import urllib.parse
import urllib.request
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "images")
UA = "StMichaelsPenkridgeGallery/1.0 (local static site)"


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
                time.sleep(2 ** attempt + 2)
                continue
            raise


def category_files(title):
    out = []
    cont = None
    while True:
        p = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": title,
            "cmtype": "file",
            "cmlimit": "500",
        }
        if cont:
            p["cmcontinue"] = cont
        data = api(p)
        out.extend(m["title"] for m in data["query"]["categorymembers"])
        cont = data.get("continue", {}).get("cmcontinue")
        if not cont:
            break
    return out


def all_titles():
    roots = ["Category:St._Michael_and_All_Angels,_Penkridge"]
    seen_cats = set(roots)
    i = 0
    while i < len(roots):
        cat = roots[i]
        i += 1
        subs = api(
            {
                "action": "query",
                "list": "categorymembers",
                "cmtitle": cat,
                "cmtype": "subcat",
                "cmlimit": "500",
            }
        )["query"]["categorymembers"]
        for s in subs:
            if s["title"] not in seen_cats:
                seen_cats.add(s["title"])
                roots.append(s["title"])
    files = []
    seen = set()
    for cat in roots:
        for t in category_files(cat):
            if t not in seen:
                seen.add(t)
                files.append(t)
    return sorted(files)


def caption_from_title(title):
    c = re.sub(r"^File:", "", title)
    c = re.sub(r" - geograph\.org\.uk - \d+", "", c)
    c = c.replace("_", " ").replace(" ^ ", " & ")
    c = re.sub(r"\.(jpe?g|png|webp)$", "", c, flags=re.I)
    return c


def tag_from_title(title):
    from gallery_tags import classify

    return classify(caption_from_title(title))


def thumb_urls(titles):
    urls = {}
    for i in range(0, len(titles), 50):
        batch = titles[i : i + 50]
        data = api(
            {
                "action": "query",
                "titles": "|".join(batch),
                "prop": "imageinfo",
                "iiprop": "url",
                "iiurlwidth": "800",
            }
        )
        for page in data["query"]["pages"].values():
            if "missing" in page or "imageinfo" not in page:
                continue
            info = page["imageinfo"][0]
            urls[page["title"]] = info.get("thumburl") or info["url"]
        time.sleep(0.4)
    return urls


def candidate_names(title):
    return [
        hashlib.sha1(title.encode()).hexdigest()[:12] + ".jpg",
        hashlib.md5(title.encode()).hexdigest()[:10] + ".jpg",
    ]


def find_local_file(title):
    for fname in candidate_names(title):
        path = os.path.join(OUT, fname)
        if os.path.exists(path) and os.path.getsize(path) > 500:
            return fname
    return None


def row_for(title):
    fname = find_local_file(title)
    if not fname:
        return None
    return {
        "file": f"images/{fname}",
        "caption": caption_from_title(title),
        "tag": tag_from_title(title),
    }


def download_file(title, url):
    fname = candidate_names(title)[0]
    path = os.path.join(OUT, fname)
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return row_for(title)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    body = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                body = r.read()
            break
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 4:
                time.sleep(2 ** attempt + 1)
                continue
            raise
    if len(body) < 500:
        return None
    with open(path, "wb") as f:
        f.write(body)
    return {"file": f"images/{fname}", "caption": caption_from_title(title), "tag": tag_from_title(title)}


def write_manifest(titles):
    import subprocess
    import sys

    manifest = [row for t in titles if (row := row_for(t))]
    path = os.path.join(OUT, "manifest.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    rank_script = os.path.join(ROOT, "scripts", "rank-gallery.py")
    subprocess.run([sys.executable, rank_script], check=False)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_titles():
    cache = os.path.join(OUT, "titles.json")
    if os.path.exists(cache):
        with open(cache, encoding="utf-8") as f:
            return json.load(f)
    titles = all_titles()
    with open(cache, "w", encoding="utf-8") as f:
        json.dump(titles, f, indent=2)
    return titles


def main():
    import sys

    os.makedirs(OUT, exist_ok=True)
    rebuild_only = "--rebuild-only" in sys.argv
    titles = load_titles()
    print(f"Catalogue: {len(titles)} Commons files")

    if not rebuild_only:
        url_map = thumb_urls(titles)
        for n, title in enumerate(titles, 1):
            if row_for(title):
                continue
            url = url_map.get(title)
            if not url:
                continue
            try:
                row = download_file(title, url)
            except Exception as e:
                print("skip", title, e)
                time.sleep(2)
                continue
            if row:
                print(f"[{n}/{len(titles)}]", row["file"])
            time.sleep(0.9)

    manifest = write_manifest(titles)
    print(f"Manifest: {len(manifest)} local photos")


if __name__ == "__main__":
    main()
