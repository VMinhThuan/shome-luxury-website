#!/usr/bin/env bash

set -Eeuo pipefail

# This script is sent over SSH and runs as root only to call aaPanel's API and
# inspect process ownership. Git and npm always run as the aaPanel project user.
APP_DIR="${VPS_APP_DIR:-/www/wwwroot/shomeluxury-node}"
BRANCH="${VPS_BRANCH:-main}"
DEPLOY_USER="${VPS_DEPLOY_USER:-www}"
NODE_BIN="${VPS_NODE_BIN:-/www/server/nodejs/v22.23.4/bin/node}"
NPM_BIN="${VPS_NPM_BIN:-$(dirname "$NODE_BIN")/npm}"
PID_FILE="${VPS_PID_FILE:-/www/server/nodejs/vhost/pids/shomeluxury_node.pid}"
APP_PORT="${VPS_PORT:-3030}"
ENV_FILE="${VPS_ENV_FILE:-.env.local}"
AAPANEL_API_URL="${VPS_AAPANEL_API_URL:-}"
AAPANEL_API_KEY="${VPS_AAPANEL_API_KEY:-}"
AAPANEL_API_KEY_FILE="${VPS_AAPANEL_API_KEY_FILE:-}"
AAPANEL_PROJECT_NAME="${VPS_AAPANEL_PROJECT_NAME:-shomeluxury_node}"
DRY_RUN="${VPS_DRY_RUN:-false}"
HEALTHCHECK_URL="${VPS_HEALTHCHECK_URL:-http://127.0.0.1:3030/}"
ADMIN_HEALTHCHECK_URL="${VPS_ADMIN_HEALTHCHECK_URL:-http://127.0.0.1:3030/admin/login}"
API_HEALTHCHECK_URL="${VPS_API_HEALTHCHECK_URL:-http://127.0.0.1:3030/api/home-images}"

die() {
  echo "[deploy] ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command is not available: $1"
}

for command_name in curl cut flock getent git md5sum ps pgrep runuser ss stat sha256sum; do
  require_command "$command_name"
done

[[ "$DRY_RUN" == "true" || "$DRY_RUN" == "false" ]] || die "VPS_DRY_RUN must be true or false."
[[ "$APP_PORT" =~ ^[0-9]+$ ]] || die "VPS_PORT must be numeric."
[[ -d "$APP_DIR" ]] || die "Source directory does not exist: $APP_DIR"
[[ -x "$NODE_BIN" ]] || die "Configured Node binary does not exist: $NODE_BIN"
[[ -x "$NPM_BIN" ]] || die "Configured npm binary does not exist: $NPM_BIN"
id "$DEPLOY_USER" >/dev/null 2>&1 || die "Deploy user does not exist: $DEPLOY_USER"

if [[ -n "$AAPANEL_API_KEY_FILE" ]]; then
  [[ -f "$AAPANEL_API_KEY_FILE" ]] || die "aaPanel API key file is missing"
  AAPANEL_API_KEY="$(cat "$AAPANEL_API_KEY_FILE")"
  trap 'rm -f -- "$AAPANEL_API_KEY_FILE"' EXIT
fi

DEPLOY_HOME="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
[[ -n "$DEPLOY_HOME" ]] || die "Could not determine home directory for $DEPLOY_USER"
SOURCE_OWNER="$(stat -c '%U' "$APP_DIR")"
[[ "$SOURCE_OWNER" == "$DEPLOY_USER" ]] || die "Source owner is $SOURCE_OWNER, expected $DEPLOY_USER"
cd "$APP_DIR"

# Prevent two GitHub jobs or manual runs from touching the same production tree.
LOCK_FILE="/run/lock/shomeluxury-node-deploy.lock"
exec 9>"$LOCK_FILE"
flock -n 9 || die "Another SHOME LUXURY deployment is already running."

run_as_deploy_user() {
  runuser -u "$DEPLOY_USER" -- env \
    HOME="$DEPLOY_HOME" \
    PATH="$(dirname "$NODE_BIN"):/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    "$@"
}

git_www() {
  run_as_deploy_user git -c "safe.directory=$APP_DIR" -C "$APP_DIR" "$@"
}

read_pid_file() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(tr -d '[:space:]' < "$PID_FILE")"
  [[ "$pid" =~ ^[0-9]+$ && "$pid" != "0" ]] || return 1
  printf '%s\n' "$pid"
}

port_pids() {
  ss -ltnpH "sport = :$APP_PORT" 2>/dev/null \
    | grep -oE 'pid=[0-9]+' \
    | cut -d= -f2 \
    | sort -n -u || true
}

process_user() {
  ps -o user= -p "$1" 2>/dev/null | awk '{$1=$1; print}'
}

process_cwd() {
  readlink -f "/proc/$1/cwd" 2>/dev/null || true
}

process_start_time() {
  awk '{print $22}' "/proc/$1/stat" 2>/dev/null || true
}

show_process_context() {
  local pid="$1"
  local ppid=""
  ppid="$(ps -o ppid= -p "$pid" 2>/dev/null | awk '{$1=$1; print}')"
  echo "[deploy] process context: pid=$pid user=$(process_user "$pid") cwd=$(process_cwd "$pid") ppid=${ppid:-unknown}"
  ps -o pid=,ppid=,user=,stat=,etime=,args= -p "$pid" 2>/dev/null || true
  if [[ -n "$ppid" && "$ppid" != "0" ]]; then
    ps -o pid=,ppid=,user=,stat=,etime=,args= -p "$ppid" 2>/dev/null || true
  fi
  while read -r child_pid; do
    [[ -n "$child_pid" ]] || continue
    ps -o pid=,ppid=,user=,stat=,etime=,args= -p "$child_pid" 2>/dev/null || true
  done < <(pgrep -P "$pid" 2>/dev/null || true)
}

verify_service_identity() {
  local pid="$1"
  local pid_user="$(process_user "$pid")"
  local pid_cwd="$(process_cwd "$pid")"
  if [[ "$pid_user" != "$DEPLOY_USER" ]]; then
    echo "[deploy] PID $pid is owned by $pid_user, expected $DEPLOY_USER" >&2
    return 1
  fi
  if [[ "$pid_cwd" != "$APP_DIR" ]]; then
    echo "[deploy] PID $pid cwd is $pid_cwd, expected $APP_DIR" >&2
    return 1
  fi
  show_process_context "$pid"
}

verify_running_service() {
  local pid
  pid="$(read_pid_file)" || die "aaPanel PID file is missing or invalid: $PID_FILE"
  kill -0 "$pid" 2>/dev/null || die "aaPanel PID $pid is not running."
  verify_service_identity "$pid"

  mapfile -t listeners < <(port_pids)
  [[ "${#listeners[@]}" -eq 1 ]] || die "Expected exactly one listener on port $APP_PORT, found ${#listeners[@]}"
  local listener_user="$(process_user "${listeners[0]}")"
  local listener_cwd="$(process_cwd "${listeners[0]}")"
  [[ "$listener_user" == "$DEPLOY_USER" ]] || die "Port $APP_PORT is owned by $listener_user, expected $DEPLOY_USER"
  [[ "$listener_cwd" == "$APP_DIR" ]] || die "Port $APP_PORT listener cwd is $listener_cwd, expected $APP_DIR"
  echo "[deploy] port $APP_PORT listener: PID ${listeners[0]} user $listener_user cwd $listener_cwd"
}

hash_protected_file() {
  local file="$1"
  if [[ -e "$APP_DIR/$file" ]]; then
    sha256sum "$APP_DIR/$file" | awk '{print $1}'
  else
    printf '%s\n' 'MISSING'
  fi
}

assert_protected_files_unchanged() {
  if [[ "$(hash_protected_file "$ENV_FILE")" != "$ENV_HASH" ]]; then
    echo "[deploy] $ENV_FILE changed during deployment" >&2
    return 1
  fi
  if [[ "$(hash_protected_file '.htaccess')" != "$HTACCESS_HASH" ]]; then
    echo "[deploy] .htaccess changed during deployment" >&2
    return 1
  fi
}

check_git_preconditions() {
  local current_branch origin_url
  current_branch="$(git_www branch --show-current)"
  [[ "$current_branch" == "$BRANCH" ]] || die "Expected branch $BRANCH, found $current_branch"

  origin_url="$(git_www remote get-url origin)"
  [[ "$origin_url" == *"VMinhThuan/shome-luxury-website"* ]] || die "Unexpected origin repository: $origin_url"

  if ! git_www diff --quiet || ! git_www diff --cached --quiet; then
    die "Working tree has tracked changes; refusing to overwrite production edits"
  fi

  if git_www ls-files --error-unmatch "$ENV_FILE" >/dev/null 2>&1; then
    die "$ENV_FILE is tracked by Git; refusing to deploy it"
  fi
  if git_www ls-files --error-unmatch .htaccess >/dev/null 2>&1; then
    die ".htaccess is tracked by Git; refusing to deploy it"
  fi
}

preflight() {
  echo "[deploy] Read-only aaPanel preflight"
  check_git_preconditions
  verify_running_service
  echo "[deploy] source owner: $SOURCE_OWNER"
  echo "[deploy] deploy user: $DEPLOY_USER"
  echo "[deploy] project: $AAPANEL_PROJECT_NAME"
  echo "[deploy] node: $NODE_BIN"
  echo "[deploy] port: $APP_PORT"
  echo "[deploy] preflight passed; no pull, npm command or restart was executed"
}

restart_aapanel_project() {
  [[ -n "$AAPANEL_API_URL" ]] || die "VPS_AAPANEL_API_URL is required for aaPanel restart"
  [[ -n "$AAPANEL_API_KEY" ]] || die "VPS_AAPANEL_API_KEY is required for aaPanel restart"

  local request_time key_hash request_token payload cookie_file response normalized
  request_time="$(date +%s)"
  key_hash="$(printf '%s' "$AAPANEL_API_KEY" | md5sum | awk '{print $1}')"
  request_token="$(printf '%s' "${request_time}${key_hash}" | md5sum | awk '{print $1}')"
  payload="$(printf '{"project_name":"%s"}' "$AAPANEL_PROJECT_NAME")"
  cookie_file="$(mktemp)"
  chmod 600 "$cookie_file"

  # AlmaLinux 8/aaPanel may ship an older curl without --fail-with-body.
  # Keep the response body so the validation below can report aaPanel errors.
  response="$(curl -ksS --max-time 30 -X POST \
    "$AAPANEL_API_URL/project/nodejs/restart_project" \
    -F "request_token=$request_token" \
    -F "request_time=$request_time" \
    -F "data=$payload" \
    -b "$cookie_file" -c "$cookie_file")" || {
      rm -f "$cookie_file"
      echo "[deploy] aaPanel restart API request failed" >&2
      return 1
    }
  rm -f "$cookie_file"

  normalized="$(printf '%s' "$response" | tr -d '[:space:]')"
  if [[ "$normalized" != *'"status":true'* && "$normalized" != *'"status":1'* && "$normalized" != *'"success":true'* ]]; then
    echo "[deploy] aaPanel restart response: $response" >&2
    return 1
  fi
  echo "[deploy] aaPanel confirmed restart for $AAPANEL_PROJECT_NAME"
}

wait_for_service() {
  local old_pid="${1:-}" new_pid listener_count listener_user new_start_time
  local attempt
  for attempt in $(seq 1 30); do
    new_pid="$(read_pid_file || true)"
    mapfile -t listeners < <(port_pids)
    listener_count="${#listeners[@]}"
    if [[ -n "$new_pid" && "$listener_count" -eq 1 && "${listeners[0]}" != "" ]]; then
      listener_user="$(process_user "${listeners[0]}")"
      if [[ "$listener_user" == "$DEPLOY_USER" ]] && kill -0 "${listeners[0]}" 2>/dev/null; then
        new_start_time="$(process_start_time "$new_pid")"
        if [[ -z "$old_pid" || "$new_pid" != "$old_pid" || ! -d "/proc/$old_pid" || "$new_start_time" != "$OLD_PID_START_TIME" ]]; then
          if verify_service_identity "$new_pid"; then
            echo "[deploy] aaPanel service ready: PID $new_pid, listener PID ${listeners[0]}"
            return 0
          fi
        fi
      fi
    fi
    sleep 2
  done

  echo "[deploy] service did not become ready with one www-owned listener on port $APP_PORT" >&2
  for listener_pid in "${listeners[@]:-}"; do
    [[ -n "$listener_pid" ]] || continue
    show_process_context "$listener_pid"
  done
  return 1
}

check_http() {
  local label="$1" url="$2" accepted_status="$3" status="" attempt
  for attempt in 1 2 3; do
    status="$(curl -kLsS -o /dev/null -w '%{http_code}' --max-time 20 "$url" || true)"
    if [[ "$status" =~ $accepted_status ]]; then
      echo "[deploy] $label OK ($status): $url"
      return 0
    fi
    sleep 2
  done
  echo "[deploy] $label failed with HTTP status $status: $url" >&2
  return 1
}

rollback() {
  local exit_code=$?
  trap - ERR
  if [[ "$ROLLBACK_ENABLED" == "1" ]]; then
    echo "[deploy] deployment failed; rolling source back to $PREVIOUS_COMMIT" >&2
    git_www reset --hard "$PREVIOUS_COMMIT" || true
    if [[ "$DEPENDENCIES_CHANGED" == "1" ]]; then
      echo "[deploy] restoring dependencies from the previous lockfile" >&2
      run_as_deploy_user "$NPM_BIN" ci --omit=dev || true
    fi
    restart_aapanel_project || true
    wait_for_service "$CURRENT_PID" || true
    assert_protected_files_unchanged || true
  fi
  exit "$exit_code"
}

ENV_HASH="$(hash_protected_file "$ENV_FILE")"
HTACCESS_HASH="$(hash_protected_file '.htaccess')"
preflight
if [[ "$DRY_RUN" == "true" ]]; then
  exit 0
fi

[[ -n "$AAPANEL_API_URL" && -n "$AAPANEL_API_KEY" ]] || die "aaPanel API credentials are required after preflight"

ROLLBACK_ENABLED=0
PREVIOUS_COMMIT=""
CURRENT_PID="$(read_pid_file)"
OLD_PID_START_TIME="$(process_start_time "$CURRENT_PID")"
DEPENDENCIES_CHANGED=0
trap rollback ERR

echo "[deploy] fetching origin/$BRANCH as $DEPLOY_USER"
git_www fetch --prune origin "$BRANCH"

REMOTE_PROTECTED_CHANGES="$(git_www diff --name-only "HEAD..origin/$BRANCH" -- "$ENV_FILE" .env '.env.*' .htaccess || true)"
[[ -z "$REMOTE_PROTECTED_CHANGES" ]] || die "Remote commit changes protected production files: $REMOTE_PROTECTED_CHANGES"

PREVIOUS_COMMIT="$(git_www rev-parse HEAD)"
git_www pull --ff-only origin "$BRANCH"
UPDATED_COMMIT="$(git_www rev-parse HEAD)"
CHANGED_FILES="$(git_www diff --name-only "$PREVIOUS_COMMIT" "$UPDATED_COMMIT" || true)"
if [[ "$CHANGED_FILES" == *"package.json"* || "$CHANGED_FILES" == *"package-lock.json"* ]]; then
  DEPENDENCIES_CHANGED=1
fi

if [[ "$DEPENDENCIES_CHANGED" == "1" ]]; then
  echo "[deploy] installing production dependencies as $DEPLOY_USER"
  run_as_deploy_user "$NPM_BIN" ci --omit=dev
else
  echo "[deploy] package manifests unchanged; skipping npm ci"
fi

if run_as_deploy_user "$NODE_BIN" -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.build ? 0 : 1)"; then
  echo "[deploy] running existing build script as $DEPLOY_USER"
  run_as_deploy_user "$NPM_BIN" run build
else
  echo "[deploy] no build script found; skipping build"
fi

assert_protected_files_unchanged
restart_aapanel_project
wait_for_service "$CURRENT_PID"
check_http "frontend" "$HEALTHCHECK_URL" '^[23][0-9][0-9]$'
check_http "admin login" "$ADMIN_HEALTHCHECK_URL" '^2[0-9][0-9]$'
check_http "API" "$API_HEALTHCHECK_URL" '^[0-4][0-9][0-9]$'
assert_protected_files_unchanged

ROLLBACK_ENABLED=0
echo "[deploy] deployment completed: $UPDATED_COMMIT"
