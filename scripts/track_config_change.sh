#!/bin/bash
# track_config_change.sh
# Tracks configuration changes in the CMDB and updates documentation

set -euo pipefail

# Configuration
WORKSPACE_DIR="${WORKSPACE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CMDB_FILE="${WORKSPACE_DIR}/cmdb.json"
CONFIG_DIR="${WORKSPACE_DIR}/config"
CHANGE_LOG="${WORKSPACE_DIR}/config_changes.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Get current timestamp
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Initialize CMDB if it doesn't exist
init_cmdb() {
    if [[ ! -f "$CMDB_FILE" ]]; then
        log_info "Initializing CMDB..."
        cat > "$CMDB_FILE" << 'EOF'
{
  "version": "1.0",
  "last_updated": null,
  "configuration_items": []
}
EOF
        log_info "CMDB initialized at ${CMDB_FILE}"
    fi
}

# Add or update a CI
add_ci() {
    local ci_id="$1"
    local ci_name="$2"
    local ci_type="$3"
    local status="$4"
    local owner="$5"
    local location="$6"
    local version="$7"
    local relationships="$8"
    
    log_step "Adding/Updating CI: ${ci_id}"
    
    # Check if CI exists
    local ci_exists=$(jq --arg id "$ci_id" '.configuration_items[] | select(.id == $id)' "$CMDB_FILE")
    
    if [[ -z "$ci_exists" ]]; then
        log_info "New CI: ${ci_id}"
        # Add new CI
        local new_ci=$(cat << EOF
{
  "id": "${ci_id}",
  "name": "${ci_name}",
  "type": "${ci_type}",
  "status": "${status}",
  "owner": "${owner}",
  "location": "${location}",
  "version": "${version:-unknown}",
  "relationships": [${relationships}],
  "created_at": "$(get_timestamp)",
  "updated_at": "$(get_timestamp)"
}
EOF
)
        # Add to array
        local temp_file=$(mktemp)
        jq --argjson ci "$new_ci" '.configuration_items += [$ci]' "$CMDB_FILE" > "$temp_file"
        mv "$temp_file" "$CMDB_FILE"
    else
        log_info "Existing CI: ${ci_id}"
        # Update existing CI
        local temp_file=$(mktemp)
        jq --arg id "$ci_id" \
           --arg name "$ci_name" \
           --arg type "$ci_type" \
           --arg status "$status" \
           --arg owner "$owner" \
           --arg location "$location" \
           --arg version "${version:-unknown}" \
           --arg relationships "${relationships}" \
           --arg timestamp "$(get_timestamp)" \
           '.configuration_items |= map(if .id == $id then .name = $name | .type = $type | .status = $status | .owner = $owner | .location = $location | .version = $version | .relationships = ($relationships | split(",")) | .updated_at = $timestamp else . end)' \
           "$CMDB_FILE" > "$temp_file"
        mv "$temp_file" "$CMDB_FILE"
    fi
    
    log_info "CI updated successfully"
}

# Log configuration change
log_config_change() {
    local ci_id="$1"
    local change_type="$2"
    local description="$3"
    local rfc_id="$4"
    local user="$5"
    
    cat >> "$CHANGE_LOG" << EOF
$(get_timestamp) | ${ci_id} | ${change_type} | ${description} | RFC:${rfc_id} | ${user}
EOF
    
    log_info "Change logged to ${CHANGE_LOG}"
}

# Show CI status
show_ci_status() {
    local ci_id="$1"
    
    if [[ ! -f "$CMDB_FILE" ]]; then
        log_error "CMDB not found"
        exit 1
    fi
    
    local ci=$(jq --arg id "$ci_id" '.configuration_items[] | select(.id == $id)' "$CMDB_FILE")
    
    if [[ -z "$ci" ]]; then
        log_error "CI ${ci_id} not found"
        exit 1
    fi
    
    echo "$ci" | jq .
}

# Show all CIs
show_all_cis() {
    if [[ ! -f "$CMDB_FILE" ]]; then
        log_error "CMDB not found"
        exit 1
    fi
    
    echo "Configuration Items in CMDB:"
    echo "=============================="
    jq -r '.configuration_items[] | "\(.id) | \(.name) | \(.type) | \(.status) | \(.owner)"' "$CMDB_FILE"
}

# Validate CI before adding
validate_ci() {
    local ci_id="$1"
    local ci_type="$2"
    
    # CI ID format validation
    if [[ ! "$ci_id" =~ ^[A-Z]{2,4}-[0-9]+$ ]]; then
        log_error "Invalid CI ID format. Expected: TYPE-NNN (e.g., SRV-001)"
        return 1
    fi
    
    # CI type validation
    local valid_types=("Server" "Network" "Storage" "Application" "Service" "Documentation" "Credential")
    local valid=false
    for t in "${valid_types[@]}"; do
        if [[ "$ci_type" == "$t" ]]; then
            valid=true
            break
        fi
    done
    
    if [[ "$valid" != "true" ]]; then
        log_error "Invalid CI type. Valid types: ${valid_types[*]}"
        return 1
    fi
    
    return 0
}

# Show usage
usage() {
    cat << EOF
Usage: $(basename "$0") <command> [OPTIONS]

Track and manage configuration changes.

COMMANDS:
    add <ci_id> <ci_name> <ci_type> <status> <owner> <location> [version]
        Add or update a configuration item
    
    log <ci_id> <change_type> <description> [rfc_id] [user]
        Log a configuration change
    
    status <ci_id>
        Show status of a specific CI
    
    list
        List all CIs in CMDB
    
    init
        Initialize CMDB (if not exists)

EXAMPLES:
    $(basename "$0") add SRV-001 "web-server-01" Server "In Production" "ops-team" "DC1-Rack15" "2.1.0"
    $(basename "$0") log SRV-001 "configuration" "Updated nginx.conf" "CHANGE-2026-0001" "admin"
    $(basename "$0") status SRV-001
    $(basename "$0") list

EOF
}

# Main
if [[ $# -eq 0 ]]; then
    usage
    exit 1
fi

COMMAND="$1"
shift

case "$COMMAND" in
    init)
        init_cmdb
        ;;
    add)
        if [[ $# -lt 6 ]]; then
            log_error "Usage: add <ci_id> <ci_name> <ci_type> <status> <owner> <location> [version]"
            exit 1
        fi
        init_cmdb
        if validate_ci "$1" "$3"; then
            add_ci "$@"
        fi
        ;;
    log)
        if [[ $# -lt 3 ]]; then
            log_error "Usage: log <ci_id> <change_type> <description> [rfc_id] [user]"
            exit 1
        fi
        log_config_change "$@"
        ;;
    status)
        if [[ $# -lt 1 ]]; then
            log_error "Usage: status <ci_id>"
            exit 1
        fi
        show_ci_status "$1"
        ;;
    list)
        show_all_cis
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        usage
        exit 1
        ;;
esac