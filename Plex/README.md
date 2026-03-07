# Plex Media Registry

Automatically generated registry of media library on usm1.9xc.local

## Location
- **Source:** `/export/Library` on usm1 (172.16.254.231)
- **Generated:** 2026-03-07

## Files

### summary.json
Quick overview with counts and statistics:
- Total movies, TV series, episodes
- Movies grouped by year
- Top 20 TV shows by episode count

### movies.json
Complete list of all movies (1,269 total). Each entry:
```json
{
  "path": "/export/Library/Movies/A/Average Joe (1990).mkv",
  "filename": "Average Joe (1990).mkv",
  "title": "Average Joe",
  "year": "1990",
  "letter": "A",
  "extension": ".mkv"
}
```

### tv_series.json
Summary of TV series (287 shows). Each entry:
```json
{
  "show": "The Simpsons (1989)",
  "episode_count": 857,
  "seasons": {"1": 13, "2": 22, ...},
  "sample_episodes": [...]
}
```

### tv_episodes.json
Complete episode list (22,731 episodes). Each entry:
```json
{
  "path": "/export/Library/TV_Series/The Simpsons (1989)/S01/The Simpsons - 1x01 - Simpsons Roasting on an Open Fire.mkv",
  "filename": "The Simpsons - 1x01 - Simpsons Roasting on an Open Fire.mkv",
  "show": "The Simpsons (1989)",
  "season": "1",
  "episode": "01",
  "extension": ".mkv"
}
```

## Statistics

**Movies:** 1,269 files
- Oldest: 1925
- Newest: 2026
- Peak year: 2025 (74 movies)
- Years without year data: 171 movies

**TV Series:** 287 shows, 22,731 episodes

**Top Shows by Episode Count:**
1. The Simpsons (1989) — 857 episodes
2. Cops (1989) — 757 episodes
3. Family Guy — 656 episodes
4. Gunsmoke (1955) — 635 episodes
5. Law & Order (1990) — 463 episodes

## Query Examples

**Find movies from a specific year:**
```python
import json
with open('Plex/movies.json') as f:
    movies = json.load(f)
year_2025 = [m for m in movies if m.get('year') == '2025']
```

**Find all episodes of a show:**
```python
with open('Plex/tv_episodes.json') as f:
    episodes = json.load(f)
simpsons = [e for e in episodes if e['show'] == 'The Simpsons (1989)']
```

**Get show summary:**
```python
with open('Plex/tv_series.json') as f:
    series = json.load(f)
for s in series:
    if 'blue bloods' in s['show'].lower():
        print(f"{s['show']}: {s['episode_count']} episodes")
```

## Regenerate

To rebuild the registry (e.g., after adding new content):

```bash
cd /home/localadmin/.openclaw/workspace
python3 Plex/build_registry.py
```

This will:
1. Scan `/export/Library/Movies` and `/export/Library/TV_Series` on usm1
2. Parse filenames for titles, years, seasons, episodes
3. Update all JSON files
