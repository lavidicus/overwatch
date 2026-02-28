#!/bin/bash
# create_change_request.sh
# Creates a new change request ticket in the workspace

set -euo pipefail

# Configuration
WORKSPACE_DIR="${WORKSPACE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CHANGE_DIR="${WORKSPACE_DIR}/changes"
RFC_PREFIX="CHANGE"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Generate RFC ID
generate_rfc_id() {
    local year=$(date +%Y)
    local sequence_file="${CHANGE_DIR}/.sequence"
    local seq_num=1
    
    if [[ -f "$sequence_file" ]]; then
        seq_num=$(cat "$sequence_file")
        ((seq_num++))
        echo "$seq_num" > "$sequence_file"
    else
        echo "1" > "$sequence_file"
    fi
    
    printf "${RFC_PREFIX}-${year}-%04d" "$seq_num"
}

# Create change request file
create_change_request() {
    local title="$1"
    local rfc_id=$(generate_rfc_id)
    local filename="${CHANGE_DIR}/${rfc_id}.md"
    
    # Validate title
    if [[ -z "$title" ]]; then
        log_error "Title is required"
        exit 1
    fi
    
    # Create directory if needed
    mkdir -p "$CHANGE_DIR"
    
    # Check if RFC ID already exists
    if [[ -f "$filename" ]]; then
        log_error "RFC ID ${rfc_id} already exists"
        exit 1
    fi
    
    # Create the file
    cat > "$filename" << EOF
# Change Request: ${title}

## RFC ID
${rfc_id}

## Basic Information

| Field | Value |
|-------|-------|
| **Title** | ${title} |
| **Requestor** | (Fill in) |
| **Date Submitted** | $(date +%Y-%m-%d) |
| **Requested Implementation Date** | (Fill in) |
| **Estimated Duration** | (Fill in) |
| **Priority** | Low / Medium / High / Critical |

## Change Details

### Description
(Fill in detailed description)

### Business Justification
(Why is this change needed?)

### Technical Details
(Detailed technical description)

### Scope
- **In Scope:** (Fill in)
- **Out of Scope:** (Fill in)

## Risk Assessment

### Risk Level
☐ Low ☐ Medium ☐ High ☐ Critical

### Impact Assessment

| Area | Status |
|------|--------|
| **Systems Affected** | (Fill in) |
| **Users Affected** | (Fill in) |
| **Dependencies** | (Fill in) |

## Implementation Plan

### Pre-Implementation Checklist
- [ ] Backup completed
- [ ] Rollback plan validated
- [ ] Stakeholders notified
- [ ] Monitoring configured
- [ ] Team ready

### Step-by-Step Implementation
1. (Fill in steps)

### Rollback Plan
(What to do if implementation fails)

### Testing Plan
(How to verify success)

## Approvals

### Requestor
- **Name:** _______________
- **Date:** _______________

### Change Manager Approval
- **Approver:** _______________
- **Date:** _______________
- **Decision:** ☐ Approved ☐ Rejected

---

**Status:** Draft
**Created:** $(date +%Y-%m-%d %H:%M:%S UTC)
EOF

    log_info "Change request created: ${rfc_id}"
    log_info "File location: ${filename}"
    log_info "Next steps: Fill in details, submit for approval"
    
    # Open in editor if available
    if command -v vim &> /dev/null; then
        log_warn "Opening editor... Press :q to exit"
        vim "$filename"
    fi
}

# Show usage
usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS] <title>

Creates a new change request ticket.

OPTIONS:
    -h, --help      Show this help message
    --edit          Open file in editor after creation

EXAMPLES:
    $(basename "$0") "Update nginx configuration"
    $(basename "$0") "Deploy application v2.1.0"

EOF
}

# Parse arguments
if [[ $# -eq 0 ]]; then
    usage
    exit 1
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        --edit)
            EDIT_MODE=true
            shift
            ;;
        *)
            TITLE="$1"
            shift
            ;;
    esac
done

# Create the change request
create_change_request "$TITLE"