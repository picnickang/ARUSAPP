#!/bin/bash

##############################################################################
# Color Definitions for Shell Scripts
# 
# Centralized color codes to prevent duplication across install.sh, deploy.sh
# and other shell scripts.
#
# Usage:
#   source "$(dirname "$0")/utils/colors.sh"
#   echo -e "${GREEN}Success!${NC}"
##############################################################################

# Text colors
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export MAGENTA='\033[0;35m'
export WHITE='\033[1;37m'
export NC='\033[0m' # No Color (reset)

# Background colors
export BG_RED='\033[0;41m'
export BG_GREEN='\033[0;42m'
export BG_YELLOW='\033[0;43m'
export BG_BLUE='\033[0;44m'
export BG_CYAN='\033[0;46m'
export BG_MAGENTA='\033[0;45m'

# Text styles
export BOLD='\033[1m'
export DIM='\033[2m'
export UNDERLINE='\033[4m'
export BLINK='\033[5m'
export REVERSE='\033[7m'

# Common color combinations
export SUCCESS="${GREEN}"
export WARNING="${YELLOW}"
export ERROR="${RED}"
export INFO="${BLUE}"
export DEBUG="${CYAN}"
