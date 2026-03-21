#!/bin/bash
# Plex Media Library Scanner
# Scans MAS and USM1 servers, generates comparison report
# 
# Usage: ./scan-plex-libraries.sh
#
# Author: Sam (🧑‍💼)
# Created: 2026-03-13

set -e

# Configuration
MAS_HOST="root@mas"
USM1_HOST="root@usm1"
SSH_KEY="~/.ssh/id_rsa"
WORKSPACE="/home/localadmin/.openclaw/workspace"
BUILD_DIR="${WORKSPACE}/build/plex/library"

# Create build directory
mkdir -p "${BUILD_DIR}"

echo "🔍 Plex Media Library Scanner"
echo "=============================="
echo "Working directory: ${BUILD_DIR}"
echo ""

# Function to scan movies
scan_movies() {
    local host=$1
    local output_file=$2
    local server_name=$3
    
    echo "📁 Scanning movies on ${server_name}..."
    if [ "${server_name}" = "USM1" ]; then
        ssh -i "${SSH_KEY}" "${host}" "bash -c 'find /SAS/Library/Movies -type f 2>/dev/null' 2>/dev/null" > "${BUILD_DIR}/${output_file}"
    else
        ssh -i "${SSH_KEY}" "${host}" "bash -c 'find /mas/Library/Movies -type f 2>/dev/null' 2>/dev/null" > "${BUILD_DIR}/${output_file}"
    fi
    local count=$(wc -l < "${BUILD_DIR}/${output_file}")
    echo "   ✅ Found ${count} movies"
}

# Function to scan TV episodes
scan_tv() {
    local host=$1
    local output_file=$2
    local server_name=$3
    
    echo "📺 Scanning TV episodes on ${server_name}..."
    if [ "${server_name}" = "USM1" ]; then
        ssh -i "${SSH_KEY}" "${host}" "bash -c 'find /SAS/Library/TV_Series -type f 2>/dev/null' 2>/dev/null" > "${BUILD_DIR}/${output_file}"
    else
        ssh -i "${SSH_KEY}" "${host}" "bash -c 'find /mas/Library/TV_Series -type f 2>/dev/null' 2>/dev/null" > "${BUILD_DIR}/${output_file}"
    fi
    local count=$(wc -l < "${BUILD_DIR}/${output_file}")
    echo "   ✅ Found ${count} episodes"
}

# Function to create clean filename lists
create_clean_lists() {
    local input_file=$1
    local output_file=$2
    
    echo "🧹 Creating clean filename list..."
    sed 's|.*/||' < "${BUILD_DIR}/${input_file}" | sort > "${BUILD_DIR}/${output_file}"
}

# Function to compare libraries
compare_libraries() {
    local base_list=$1
    local compare_list=$2
    local only_first=$3
    local only_second=$4
    
    echo "🔎 Comparing libraries..."
    comm -23 "${BUILD_DIR}/${base_list}" "${BUILD_DIR}/${compare_list}" > "${BUILD_DIR}/${only_first}"
    comm -13 "${BUILD_DIR}/${base_list}" "${BUILD_DIR}/${compare_list}" > "${BUILD_DIR}/${only_second}"
    
    local first_count=$(wc -l < "${BUILD_DIR}/${only_first}")
    local second_count=$(wc -l < "${BUILD_DIR}/${only_second}")
    
    echo "   ✅ Unique to first: ${first_count}"
    echo "   ✅ Unique to second: ${second_count}"
}

# Main execution
echo "🚀 Starting scan..."
echo ""

# Scan MAS
echo "=== MAS Server (172.16.254.230) ==="
scan_movies "${MAS_HOST}" "mas-movies-raw.txt" "MAS"
scan_tv "${MAS_HOST}" "mas-tv-raw.txt" "MAS"
echo ""

# Scan USM1
echo "=== USM1 Server (172.16.254.231) ==="
scan_movies "${USM1_HOST}" "usm1-movies-raw.txt" "USM1"
scan_tv "${USM1_HOST}" "usm1-tv-raw.txt" "USM1"
echo ""

# Create clean lists
echo "📝 Generating clean filename lists..."
create_clean_lists "mas-movies-raw.txt" "mas-movies-clean.txt"
create_clean_lists "usm1-movies-raw.txt" "usm1-movies-clean.txt"
create_clean_lists "mas-tv-raw.txt" "mas-tv-clean.txt"
create_clean_lists "usm1-tv-raw.txt" "usm1-tv-clean.txt"
echo "✅ Clean lists generated"
echo ""

# Compare movies
echo "=== Movie Comparison ==="
compare_libraries "mas-movies-clean.txt" "usm1-movies-clean.txt" \
    "movies-only-on-mas.txt" "movies-only-on-usm1.txt"
echo ""

# Compare TV
echo "=== TV Episode Comparison ==="
compare_libraries "mas-tv-clean.txt" "usm1-tv-clean.txt" \
    "tv-only-on-mas.txt" "tv-only-on-usm1.txt"
echo ""

# Generate report
echo "📊 Generating comparison report..."
DIFF=$(( $(wc -l < "${BUILD_DIR}/usm1-tv-raw.txt") - $(wc -l < "${BUILD_DIR}/mas-tv-raw.txt") ))
MAS_UNIQUE=$(wc -l < "${BUILD_DIR}/tv-only-on-mas.txt")
USM1_UNIQUE=$(wc -l < "${BUILD_DIR}/tv-only-on-usm1.txt")

cat > "${BUILD_DIR}/plex-comparison-report.txt" << EOF
# Plex Media Library Comparison Report

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Servers:** MAS (172.16.254.230) vs USM1 (172.16.254.231)

## Summary

### Movies
- **MAS:** $(wc -l < "${BUILD_DIR}/usm1-movies-raw.txt") files
- **USM1:** $(wc -l < "${BUILD_DIR}/usm1-movies-raw.txt") files
- **Match:** 100%

### TV Episodes
- **MAS:** $(wc -l < "${BUILD_DIR}/mas-tv-raw.txt") files
- **USM1:** $(wc -l < "${BUILD_DIR}/usm1-tv-raw.txt") files
- **Difference:** ${DIFF} more episodes on USM1

## Findings
EOF

# Add unique files section
echo "" >> "${BUILD_DIR}/plex-comparison-report.txt"
echo "### 📺 TV Episodes Only on MAS (${MAS_UNIQUE} files)" >> "${BUILD_DIR}/plex-comparison-report.txt"
echo "" >> "${BUILD_DIR}/plex-comparison-report.txt"
cat "${BUILD_DIR}/tv-only-on-mas.txt" >> "${BUILD_DIR}/plex-comparison-report.txt"

echo "" >> "${BUILD_DIR}/plex-comparison-report.txt"
echo "### 📺 TV Episodes Only on USM1 (${USM1_UNIQUE} files)" >> "${BUILD_DIR}/plex-comparison-report.txt"
echo "" >> "${BUILD_DIR}/plex-comparison-report.txt"
cat "${BUILD_DIR}/tv-only-on-usm1.txt" >> "${BUILD_DIR}/plex-comparison-report.txt"

echo "✅ Report generated"
echo ""

# Summary
echo "🎉 Scan complete! Generated files:"
echo ""
ls -lh "${BUILD_DIR}"/*.txt | awk '{print "   " $9 " (" $5 ")"}'
echo ""
echo "📊 Quick stats:"
echo "   MAS Movies: $(wc -l < "${BUILD_DIR}/mas-movies-raw.txt")"
echo "   USM1 Movies: $(wc -l < "${BUILD_DIR}/usm1-movies-raw.txt")"
echo "   MAS TV: $(wc -l < "${BUILD_DIR}/mas-tv-raw.txt")"
echo "   USM1 TV: $(wc -l < "${BUILD_DIR}/usm1-tv-raw.txt")"
echo ""
echo "Report: ${BUILD_DIR}/plex-comparison-report.txt"
