#!/usr/bin/env python3
"""Smart match TV files between MAS and USM1 by show+SxxExx, ignoring episode titles."""
import re
from collections import defaultdict

def extract_key(filename):
    """Extract (show_name, season_episode_key) from filename.
    Returns normalized show name + all SxxExx codes found."""
    # Remove extension
    name = re.sub(r'\.(mkv|mp4|avi|ts|m4v|srt|nfo|jpg|png|idx|sub|ass|ssa)$', '', filename, flags=re.I)
    
    # Find all SxxExx patterns (including multi-episode like S01E01-E02)
    ep_matches = re.findall(r'S(\d+)E(\d+)', name, re.I)
    if not ep_matches:
        return None, None
    
    # Get show name (everything before first SxxExx)
    show_part = re.split(r'S\d+E\d+', name, flags=re.I)[0].strip()
    # Normalize: lowercase, strip special chars, collapse whitespace
    show_norm = re.sub(r'[^a-z0-9\s]', '', show_part.lower()).strip()
    show_norm = re.sub(r'\s+', ' ', show_norm)
    
    # Build episode key from all episodes referenced
    ep_key = tuple(sorted(set((int(s), int(e)) for s, e in ep_matches)))
    
    return show_norm, ep_key

def load_file(path):
    with open(path) as f:
        return [line.strip() for line in f if line.strip()]

mas_files = load_file('tv-only-on-mas.txt')
usm1_files = load_file('tv-only-on-usm1.txt')

# Build lookup: (show, episodes) -> [filenames]
mas_index = defaultdict(list)
usm1_index = defaultdict(list)

mas_unparsed = []
usm1_unparsed = []

for fn in mas_files:
    show, ep = extract_key(fn)
    if show:
        mas_index[(show, ep)].append(fn)
    else:
        mas_unparsed.append(fn)

for fn in usm1_files:
    show, ep = extract_key(fn)
    if show:
        usm1_index[(show, ep)].append(fn)
    else:
        usm1_unparsed.append(fn)

# Find matches (duplicates with different names)
duplicates = []
mas_only_keys = set()
usm1_only_keys = set()

all_keys = set(mas_index.keys()) | set(usm1_index.keys())
for key in sorted(all_keys):
    in_mas = key in mas_index
    in_usm1 = key in usm1_index
    if in_mas and in_usm1:
        duplicates.append((key, mas_index[key], usm1_index[key]))
    elif in_mas:
        mas_only_keys.add(key)
    else:
        usm1_only_keys.add(key)

# Group by show for readability
def group_by_show(keys, index):
    shows = defaultdict(list)
    for key in sorted(keys):
        show, ep = key
        for fn in index[key]:
            shows[show].append(fn)
    return dict(sorted(shows.items()))

# Output
print("=" * 80)
print("SMART MATCH RESULTS")
print("=" * 80)

print(f"\n## DUPLICATES (same show+episode, different filenames): {len(duplicates)} episodes")
print("-" * 60)
dup_shows = defaultdict(list)
for key, mas_fns, usm1_fns in duplicates:
    show, ep = key
    dup_shows[show].append((ep, mas_fns, usm1_fns))

for show in sorted(dup_shows):
    print(f"\n### {show.title()}")
    for ep, mas_fns, usm1_fns in sorted(dup_shows[show]):
        ep_str = ', '.join(f'S{s:02d}E{e:02d}' for s, e in ep)
        print(f"  {ep_str}")
        for fn in mas_fns:
            print(f"    MAS:  {fn}")
        for fn in usm1_fns:
            print(f"    USM1: {fn}")

print(f"\n\n## TRULY ONLY ON MAS (not on USM1 at all): {sum(len(mas_index[k]) for k in mas_only_keys)} files")
print("-" * 60)
mas_grouped = group_by_show(mas_only_keys, mas_index)
for show, files in mas_grouped.items():
    print(f"\n### {show.title()}")
    for fn in files:
        print(f"  {fn}")

print(f"\n\n## TRULY ONLY ON USM1 (missing from MAS): {sum(len(usm1_index[k]) for k in usm1_only_keys)} files")
print("-" * 60)
usm1_grouped = group_by_show(usm1_only_keys, usm1_index)
for show, files in usm1_grouped.items():
    print(f"\n### {show.title()}")
    for fn in files:
        print(f"  {fn}")

if mas_unparsed:
    print(f"\n\n## UNPARSED MAS FILES (no SxxExx pattern): {len(mas_unparsed)}")
    for fn in mas_unparsed:
        print(f"  {fn}")

if usm1_unparsed:
    print(f"\n\n## UNPARSED USM1 FILES (no SxxExx pattern): {len(usm1_unparsed)}")
    for fn in usm1_unparsed:
        print(f"  {fn}")

# Summary
print("\n\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"Duplicates (same episode, different name): {len(duplicates)} episodes")
print(f"Truly only on MAS: {sum(len(mas_index[k]) for k in mas_only_keys)} files across {len(mas_grouped)} shows")
print(f"Truly only on USM1 (you're missing on MAS): {sum(len(usm1_index[k]) for k in usm1_only_keys)} files across {len(usm1_grouped)} shows")
print(f"Unparsed MAS: {len(mas_unparsed)}")
print(f"Unparsed USM1: {len(usm1_unparsed)}")
