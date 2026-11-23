# PRACTICE // PARAMETERS

A live dashboard for an artistic practice: active projects, topics, short- and long-term applications, progress, texts, people and references.

Plain HTML/CSS/JS, no build step. Everything you see comes from the JSON files in `data/`, so **updating the dashboard = editing data, never code.**

## How it updates

| What | Where | Who updates it |
|---|---|---|
| Short-term applications + events | `data/applications.json` | **Weekly sync**: Claude checks new Instagram saves → the Applications & Events Tracker → rewrites this file → commits. You can also edit it directly. |
| Projects (A/B/C) | `data/projects.json` | You, or ask Claude ("Substrate is now *producing*, next: edit the film") |
| Long-term (MFA/PhD) | `data/longterm.json` | You / Claude: tick `steps` as you go |
| Topics, title, tagline, repo | `data/site.json` | Rarely |
| Progress | `data/progress.json` | Occasionally (set `progress` 0–100) |
| Important texts | `data/texts.json` + `assets/covers/` | You |
| People | `data/people.json` | You (public: no private notes) |
| References | `data/references.json` + `assets/refs/` | You |

Every section on the page has an **[edit]** link that opens its file in GitHub's editor (they appear once `repo` in `data/site.json` is set). Commit → GitHub Pages republishes in about a minute.

## The tagging rule

Topics have ids `TX01…TX05` (in `site.json`), projects `PX01…PX03`. Tag any item with `"topics": ["TX03"]` and/or `"projects": ["PX02"]`:

- **Project → topic lines** on the map are drawn from `projects.json` → `topics`.
- **Clicking a topic or project** (or pressing 1–5) highlights everything tagged with it across the page. `Esc` clears. Links like `…/#TX02` open pre-filtered.

## Computed automatically (never type these)

- Days left / `T–n` and the live `NEXT:` countdown, from `date` and today's date.
- Past items with status `to-review`, `interested` or `applying` show as `missed`.
- The top three upcoming items per tab (applications / events / all).

## Field reference

`applications.json` → `items[]`
`id` · `name` · `type` (`application`|`event`) · `date` (`YYYY-MM-DD` or `null`) · `dateLabel` · `status` (`to-review`|`interested`|`applying`|`submitted`|`going`|`accepted`|`rejected`|`missed`|`not-for-me`) · `where` · `money` · `link` · `source` · `notes` · `topics[]` · `projects[]`

`projects.json` → `id` · `key` · `name` · `state` · `next` · `topics[]` · `pos` [x%, y%] · `link` · `notes`

`longterm.json` → `school` · `program` · `deadline` · `link` · `topics[]` · `steps` [materials, recommenders, submitted, interview, decision] · `notes`

`texts.json` → `title` · `author` · `year` · `cover` (e.g. `assets/covers/text-01.jpg`) · `why` · `topics[]` · `projects[]`

## Run locally

```sh
python3 -m http.server
# open http://localhost:8000
```

(The page fetches `data/*.json`, so it needs a web server; opening `index.html` directly won't load data.)

## Note

This repo and site are **public**. Keep recommender names, rejections you'd rather not share, and private notes out of these files.

## Cache-busting

`index.html` loads `style.css?v=…` and `app.js?v=…`. Bump the `v=` value whenever either file changes, or browsers may keep the old one for up to 10 minutes. Data files are always fetched fresh.
