#!/usr/bin/env python3
"""Build Plex media registry from file lists."""

import json
import os
import re
from pathlib import Path
from collections import defaultdict

def parse_movie_path(filepath):
    """Extract movie info from filepath."""
    filepath = filepath.strip()
    parts = filepath.split('/')
    
    # Get the filename
    filename = os.path.basename(filepath)
    ext = os.path.splitext(filename)[1].lower()
    name = filename[:-len(ext)] if ext in filename else filename
    
    # Get letter directory
    letter_dir = parts[4] if len(parts) > 4 else ''
    
    # Try to extract year and title
    # Format variations: "Movie Title (2020)", "Movie Title - 2020", "2020 - Movie Title"
    year_match = re.search(r'\((\d{4})\)|[-_]\s*(\d{4})|^(\d{4})', name)
    year = None
    if year_match:
        year = year_match.group(1) or year_match.group(2) or year_match.group(3)
    
    title = name
    if year:
        title = re.sub(r'\s*\(\d{4}\)\s*$', '', name)
        title = re.sub(r'\s*[-_]\s*\d{4}\s*$', '', title)
        title = re.sub(r'^\d{4}\s*[-_]\s*', '', title)
    
    return {
        'path': filepath,
        'filename': filename,
        'title': title.strip(),
        'year': year,
        'letter': letter_dir,
        'extension': ext
    }

def parse_tv_path(filepath):
    """Extract TV show info from filepath."""
    filepath = filepath.strip()
    parts = filepath.split('/')
    
    # Get the filename
    filename = os.path.basename(filepath)
    ext = os.path.splitext(filename)[1].lower()
    name = filename[:-len(ext)] if ext in filename else filename
    
    # Find TV_Series index
    try:
        tv_idx = parts.index('TV_Series')
        show_name = parts[tv_idx + 1] if tv_idx + 1 < len(parts) else ''
        season_match = re.search(r'S(\d+)', show_name)
        season_name = show_name
        if season_match:
            season_num = season_match.group(1)
            # Get parent directory as show name
            season_name = parts[tv_idx + 1]
            show_name = parts[tv_idx + 1]  # Simplified - use season dir
        else:
            season_num = None
    except ValueError:
        show_name = ''
        season_num = None
    
    # Parse episode info from filename
    # Formats: "Show - S01E01 - Title", "Show.S01E01.Title", "Show - 1x01 - Title"
    ep_match = re.search(r'[-_]\s*(\d{1,2})x(\d{2,3})|S(\d{1,2})E(\d{2,3})', name, re.IGNORECASE)
    season = ep_match.group(1) or ep_match.group(3) if ep_match else None
    episode = ep_match.group(2) or ep_match.group(4) if ep_match else None
    
    return {
        'path': filepath,
        'filename': filename,
        'show': show_name,
        'season': season,
        'episode': episode,
        'extension': ext
    }

def build_registry():
    """Build the complete media registry."""
    
    # Read movie list
    with open('/tmp/raw_movies.txt', 'r') as f:
        movie_paths = [line.strip() for line in f if line.strip()]
    
    # Read TV list
    with open('/tmp/raw_tv.txt', 'r') as f:
        tv_paths = [line.strip() for line in f if line.strip()]
    
    print(f"Processing {len(movie_paths)} movies...")
    movies = [parse_movie_path(p) for p in movie_paths]
    
    print(f"Processing {len(tv_paths)} TV episodes...")
    tv_episodes = [parse_tv_path(p) for p in tv_paths]
    
    # Group TV episodes by show
    tv_shows = defaultdict(list)
    for ep in tv_episodes:
        tv_shows[ep['show']].append(ep)
    
    # Build TV shows list with episode counts
    tv_series = []
    for show, episodes in sorted(tv_shows.items()):
        seasons = defaultdict(list)
        for ep in episodes:
            if ep['season']:
                seasons[ep['season']].append(ep)
        
        tv_series.append({
            'show': show,
            'episode_count': len(episodes),
            'seasons': {s: len(e) for s, e in sorted(seasons.items())},
            'sample_episodes': episodes[:3]  # Just first 3 for reference
        })
    
    # Create output directory
    output_dir = Path('/home/localadmin/.openclaw/workspace/Plex')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save movies
    movies_file = output_dir / 'movies.json'
    with open(movies_file, 'w') as f:
        json.dump(movies, f, indent=2)
    print(f"Saved {len(movies)} movies to {movies_file}")
    
    # Save TV series
    tv_file = output_dir / 'tv_series.json'
    with open(tv_file, 'w') as f:
        json.dump(tv_series, f, indent=2)
    print(f"Saved {len(tv_series)} TV series to {tv_file}")
    
    # Save full TV episodes (might be large)
    episodes_file = output_dir / 'tv_episodes.json'
    with open(episodes_file, 'w') as f:
        json.dump(tv_episodes, f, indent=2)
    print(f"Saved {len(tv_episodes)} TV episodes to {episodes_file}")
    
    # Save summary
    summary = {
        'total_movies': len(movies),
        'total_tv_series': len(tv_series),
        'total_tv_episodes': len(tv_episodes),
        'movies_by_year': {},
        'top_tv_shows_by_episodes': sorted(
            [(s['show'], s['episode_count']) for s in tv_series],
            key=lambda x: x[1],
            reverse=True
        )[:20]
    }
    
    # Count movies by year
    year_counts = defaultdict(int)
    for m in movies:
        year = m.get('year') or 'Unknown'
        year_counts[year] += 1
    summary['movies_by_year'] = dict(sorted(year_counts.items()))
    
    summary_file = output_dir / 'summary.json'
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"Saved summary to {summary_file}")
    
    print("\n=== SUMMARY ===")
    print(f"Movies: {len(movies)}")
    print(f"TV Series: {len(tv_series)}")
    print(f"TV Episodes: {len(tv_episodes)}")

if __name__ == '__main__':
    build_registry()
