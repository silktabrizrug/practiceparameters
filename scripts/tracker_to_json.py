#!/usr/bin/env python3
"""Merge rows exported from the Applications & Events Tracker into data/applications.json.

Usage:
    python3 scripts/tracker_to_json.py rows.json [data/applications.json]

rows.json is a JSON list of objects with the tracker's column headers as keys:
    Name, Type, Date (YYYY-MM-DD or empty), Status, Date is, Where, Money, Source, Notes
Source may be a plain URL or markdown like "[@handle](https://...)".

Merge rules (so hand edits on the site side survive):
  - rows are matched to existing items by normalised name; the existing id,
    topics and projects are kept
  - tracker values win for date, status, where, money, link, notes
  - items that exist only in applications.json are kept as they are
"""
import json, re, sys, unicodedata
from datetime import date

STATUS = {"to review": "to-review", "interested": "interested", "applying": "applying",
          "submitted": "submitted", "going": "going", "missed": "missed",
          "not for me": "not-for-me", "accepted": "accepted", "rejected": "rejected"}


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def slug(s):
    return re.sub(r"\s+", "-", norm(s))[:60] or "item"


def source(v):
    v = (v or "").strip()
    m = re.match(r"^\[(.+?)\]\((https?://[^)]+)\)$", v)
    if m:
        return m.group(1).replace("\\_", "_"), m.group(2)
    if re.match(r"^https?://", v):
        return re.sub(r"^https?://(www\.)?", "", v).rstrip("/"), v
    return (v or None), None


def main(rows_path, app_path="data/applications.json"):
    rows = json.load(open(rows_path))
    doc = json.load(open(app_path))
    items = doc["items"]
    by_name = {norm(it["name"]): it for it in items}
    ids = {it["id"] for it in items}
    added = updated = 0
    for r in rows:
        name = (r.get("Name") or "").strip()
        if not name:
            continue
        src, link = source(r.get("Source"))
        typ = (r.get("Type") or "Application").strip().lower()
        fields = {
            "type": "event" if typ == "event" else "application",
            "date": (r.get("Date") or None) or None,
            "dateLabel": r.get("Date is") or None,
            "status": STATUS.get(norm(r.get("Status")), "to-review"),
            "where": r.get("Where") or None,
            "money": (str(r["Money"]) if r.get("Money") not in (None, "") else None),
            "link": link, "source": src, "notes": r.get("Notes") or None,
        }
        it = by_name.get(norm(name))
        if it:
            it.update(fields)
            updated += 1
        else:
            new_id, n = slug(name), 2
            while new_id in ids:
                new_id, n = f"{slug(name)}-{n}", n + 1
            ids.add(new_id)
            item = {"id": new_id, "name": name, **fields, "topics": [], "projects": []}
            items.append(item)
            by_name[norm(name)] = item
            added += 1
    doc["updated"] = date.today().isoformat()
    json.dump(doc, open(app_path, "w"), ensure_ascii=False, indent=2)
    open(app_path, "a").write("\n")
    print(f"updated {updated}, added {added}, total {len(items)}")


if __name__ == "__main__":
    main(*sys.argv[1:])
