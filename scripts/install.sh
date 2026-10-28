#!/usr/bin/env bash
set -euo pipefail

MIN_NODE_MAJOR=24
MIN_NODE_MINOR=11
MIN_NODE_PATCH=0
MIN_NODE_VERSION="${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}.${MIN_NODE_PATCH}"
DEFAULT_NODE_MAJOR=24
PAPERCLIP_PACKAGE="paperclipai"
PUBLIC_NPM_REGISTRY="https://registry.npmjs.org"
HOMEBREW_INSTALL_COMMIT="99e13e96cbbdc1ac1ac09c0a40b450bf219ef3aa"
HOMEBREW_INSTALL_SHA256="99287f194a8b3c9e6b0203a11a5fa54518be57209343e6bb954dec4635796d9d"
NODESOURCE_DISTRIBUTIONS_COMMIT="9b431d8ae0f10df272598585855c6eca6c0e1bd2"
NODESOURCE_DEB_SHA256="6e3d580f5bd7ccf2aa1e8df8d35c60d78e873c3ff8beb282c9bebd914904ad72"
NODESOURCE_RPM_SHA256="5550ad302050f887377a0451e720b800466573ebc83392fea80924393dba642b"

INSTALLER_LANG="${PAPERCLIP_LANG:-pt-BR}"
case "$INSTALLER_LANG" in
  pt-BR|en) ;;
  *) printf '[paperclip] erro: Idioma inválido. Use pt-BR ou en.\n' >&2; exit 1 ;;
esac

CANARY=0
VERSION=""
REF=""
REPO=""
NO_ONBOARD=0
NO_PROMPT=0
INSTALL_SERVICE=0
DRY_RUN=0
VERBOSE=0
TEMP_DIR=""
PIPED_INSTALL=0

if [ -z "${BASH_SOURCE[0]:-}" ] || [ ! -f "${BASH_SOURCE[0]}" ]; then
  PIPED_INSTALL=1
fi

usage() {
  if [ "$INSTALLER_LANG" = "pt-BR" ]; then
    cat <<'EOF'
Instale o Paperclip no macOS, Linux ou WSL2.

Uso:
  curl -fsSLO https://paperclip.ing/install.sh
  bash install.sh [opções]
  curl -fsSL https://paperclip.ing/install.sh | bash -s -- --no-prompt [opções]

Opções:
  --canary                 Instalar o canal canary
  --version <version>      Instalar uma versão publicada específica
  --no-onboard             Não iniciar a configuração após a instalação
  --no-prompt              Executar sem interação
  --install-service        Instalar o serviço do Paperclip para este usuário
  --dry-run                Mostrar o plano sem alterar arquivos
  --verbose                Ativar a saída detalhada do instalador
  -h, --help               Mostrar esta ajuda

Cada opção também tem uma variável PAPERCLIP_INSTALL_* equivalente, por exemplo
PAPERCLIP_INSTALL_VERSION=2026.722.0 e PAPERCLIP_INSTALL_NO_PROMPT=1.
Defina PAPERCLIP_LANG=en para exibir as mensagens do instalador em inglês.

Para instalar um ramo, tag ou commit do Git, use a CLI do Paperclip diretamente:
npx paperclipai install --ref <ref>
EOF
  else
    cat <<'EOF'
Install Paperclip on macOS, Linux, or WSL2.

Usage:
  curl -fsSLO https://paperclip.ing/install.sh
  bash install.sh [options]
  curl -fsSL https://paperclip.ing/install.sh | bash -s -- --no-prompt [options]

Options:
  --canary                 Install the canary channel
  --version <version>      Install an exact published version
  --no-onboard             Do not start onboarding after installation
  --no-prompt              Run non-interactively
  --install-service        Install the per-user Paperclip service
  --dry-run                Print the install plan without changing files
  --verbose                Enable verbose installer output
  -h, --help               Show this help

Every option also has a PAPERCLIP_INSTALL_* environment equivalent, for example
PAPERCLIP_INSTALL_VERSION=2026.722.0 and PAPERCLIP_INSTALL_NO_PROMPT=1.
Set PAPERCLIP_LANG=pt-BR to display installer messages in Brazilian Portuguese.

To install from a git branch, tag, or commit, use the Paperclip CLI directly:
npx paperclipai install --ref <ref>
EOF
  fi
}

message() {
  local key="$1"
  shift

  case "$INSTALLER_LANG:$key" in
    pt-BR:boolean_value) printf '%s deve ser um destes valores: 1, 0, true, false, yes, no, on, off' "$1" ;;
    en:boolean_value) printf '%s must be one of: 1, 0, true, false, yes, no, on, off' "$1" ;;
    pt-BR:option_requires_value) printf 'A opção %s exige um valor' "$1" ;;
    en:option_requires_value) printf '%s requires a value' "$1" ;;
    pt-BR:unknown_option) printf 'opção desconhecida: %s' "$1" ;;
    en:unknown_option) printf 'unknown option: %s' "$1" ;;
    pt-BR:unexpected_argument) printf 'argumento inesperado: %s' "$1" ;;
    en:unexpected_argument) printf 'unexpected argument: %s' "$1" ;;
    pt-BR:canary_version_conflict) printf '%s' '--canary e --version não podem ser usados juntos' ;;
    en:canary_version_conflict) printf '%s' '--canary and --version cannot be used together' ;;
    pt-BR:git_ref_unsupported) printf '%s' "instalações por referência Git não são compatíveis com install.sh; execute 'npx paperclipai install --ref <ref>'" ;;
    en:git_ref_unsupported) printf '%s' "git-ref installs are not supported by install.sh; run 'npx paperclipai install --ref <ref>' instead" ;;
    pt-BR:noninteractive_requires_opt_in) printf '%s' 'a instalação sem interação exige a opção explícita --no-prompt; baixe o script primeiro para revisá-lo' ;;
    en:noninteractive_requires_opt_in) printf '%s' 'non-interactive installation requires explicit --no-prompt; download the script first for interactive review' ;;
    pt-BR:unsupported_os) printf 'sistema operacional sem suporte: %s. Use macOS, Linux ou WSL2.' "$1" ;;
    en:unsupported_os) printf 'unsupported operating system: %s. Use macOS, Linux, or WSL2.' "$1" ;;
    pt-BR:unsupported_arch) printf 'arquitetura sem suporte: %s. Arquiteturas compatíveis: x64, arm64.' "$1" ;;
    en:unsupported_arch) printf 'unsupported architecture: %s. Supported architectures: x64, arm64.' "$1" ;;
    pt-BR:detected) printf 'Detectado %s' "$1" ;;
    en:detected) printf 'Detected %s' "$1" ;;
    pt-BR:run_command_prompt) printf '%s' 'Executar este comando? [y/N] ' ;;
    en:run_command_prompt) printf '%s' 'Run this command? [y/N] ' ;;
    pt-BR:installation_cancelled) printf '%s' 'instalação cancelada' ;;
    en:installation_cancelled) printf '%s' 'installation cancelled' ;;
    pt-BR:sudo_required) printf '%s' 'sudo é necessário para instalar o Node.js com o gerenciador de pacotes do sistema' ;;
    en:sudo_required) printf '%s' 'sudo is required to install Node.js with the system package manager' ;;
    pt-BR:curl_required) printf '%s' 'curl é necessário para preparar a instalação do Node.js' ;;
    en:curl_required) printf '%s' 'curl is required to bootstrap Node.js' ;;
    pt-BR:download_empty) printf 'o script baixado está vazio: %s' "$1" ;;
    en:download_empty) printf 'downloaded script is empty: %s' "$1" ;;
    pt-BR:hash_tool_required) printf '%s' 'sha256sum ou shasum é necessário para verificar os scripts baixados' ;;
    en:hash_tool_required) printf '%s' 'sha256sum or shasum is required to verify downloaded scripts' ;;
    pt-BR:checksum_mismatch) printf 'o checksum do script baixado não corresponde: %s' "$1" ;;
    en:checksum_mismatch) printf 'checksum mismatch for downloaded script: %s' "$1" ;;
    pt-BR:not_script) printf 'o arquivo baixado não é um script executável: %s' "$1" ;;
    en:not_script) printf 'downloaded file is not an executable script: %s' "$1" ;;
    pt-BR:syntax_invalid) printf 'o script baixado falhou na validação de sintaxe: %s' "$1" ;;
    en:syntax_invalid) printf 'downloaded script failed syntax validation: %s' "$1" ;;
    pt-BR:nvm_detected) printf "nvm foi detectado. Execute 'nvm install %s' e tente novamente." "$1" ;;
    en:nvm_detected) printf "nvm was detected. Run 'nvm install %s' and retry this installer." "$1" ;;
    pt-BR:asdf_detected) printf "asdf foi detectado. Execute 'asdf install nodejs %s' e tente novamente." "$1" ;;
    en:asdf_detected) printf "asdf was detected. Run 'asdf install nodejs %s' and retry this installer." "$1" ;;
    pt-BR:homebrew_required) printf '%s' 'Homebrew é necessário para instalar o Node.js' ;;
    en:homebrew_required) printf '%s' 'Homebrew is required to install Node.js' ;;
    pt-BR:homebrew_not_on_path) printf '%s' "a instalação do Homebrew terminou, mas 'brew' não está disponível no PATH" ;;
    en:homebrew_not_on_path) printf '%s' "Homebrew installation completed but 'brew' is not available on PATH" ;;
    pt-BR:no_package_manager) printf '%s' 'nenhum gerenciador de pacotes Node.js compatível foi encontrado. Compatíveis: apt, dnf, pacman, apk.' ;;
    en:no_package_manager) printf '%s' 'no supported Node.js package manager found. Supported: apt, dnf, pacman, apk.' ;;
    pt-BR:node_too_old) printf 'Node.js %s é antigo demais; é necessário Node.js >= %s' "$1" "$2" ;;
    en:node_too_old) printf 'Node.js %s is too old; Node.js >= %s is required' "$1" "$2" ;;
    pt-BR:node_not_found) printf '%s' 'Node.js não foi encontrado' ;;
    en:node_not_found) printf '%s' 'Node.js was not found' ;;
    pt-BR:installing_node) printf 'Instalando Node.js %s' "$1" ;;
    en:installing_node) printf 'Installing Node.js %s' "$1" ;;
    pt-BR:piped_bootstrap_disabled) printf '%s' "a preparação do Node.js está desativada quando o script é recebido por pipe; baixe install.sh, revise-o e execute 'bash install.sh --no-prompt'" ;;
    en:piped_bootstrap_disabled) printf '%s' "Node.js bootstrap is disabled for piped installs; download install.sh, review it, and run 'bash install.sh --no-prompt'" ;;
    pt-BR:node_install_unavailable) printf 'a instalação do Node.js terminou, mas Node.js >= %s com npm/npx não está disponível' "$1" ;;
    en:node_install_unavailable) printf 'Node.js installation finished, but Node.js >= %s with npm/npx is not available' "$1" ;;
    pt-BR:using_node) printf 'Usando Node.js %s' "$1" ;;
    en:using_node) printf 'Using Node.js %s' "$1" ;;
    pt-BR:installed_node) printf 'Node.js %s instalado' "$1" ;;
    en:installed_node) printf 'Installed Node.js %s' "$1" ;;
    pt-BR:delegating_cli) printf '%s' 'Encaminhando a instalação para a CLI do Paperclip' ;;
    en:delegating_cli) printf '%s' 'Delegating to the Paperclip CLI' ;;
    pt-BR:installing_service) printf '%s' 'Instalando o serviço do Paperclip' ;;
    en:installing_service) printf '%s' 'Installing the Paperclip service' ;;
    pt-BR:installed_cli_not_on_path) printf '%s' "O Paperclip foi instalado, mas 'paperclipai' não está disponível no PATH. Abra um novo terminal e execute 'paperclipai onboard'." ;;
    en:installed_cli_not_on_path) printf '%s' "Paperclip was installed, but 'paperclipai' is not available on PATH. Open a new shell and run 'paperclipai onboard'." ;;
    pt-BR:installation_complete_onboard) printf '%s' 'Instalação concluída. Próxima etapa: paperclipai onboard' ;;
    en:installation_complete_onboard) printf '%s' 'Installation complete. Next: paperclipai onboard' ;;
    pt-BR:installation_complete) printf '%s' 'Instalação concluída.' ;;
    en:installation_complete) printf '%s' 'Installation complete.' ;;
    *) printf 'Unknown installer message: %s' "$key" ;;
  esac
}

log() {
  printf '[paperclip] %s\n' "$*"
}

fail() {
  if [ "$INSTALLER_LANG" = "pt-BR" ]; then
    printf '[paperclip] erro: %s\n' "$*" >&2
  else
    printf '[paperclip] error: %s\n' "$*" >&2
  fi
  exit 1
}

parse_bool() {
  local name="$1"
  local value="${2:-}"

  # ${value,,} requires bash 4; macOS ships bash 3.2, so lowercase portably.
  value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
  case "$value" in
    ""|0|false|no|off) printf '0' ;;
    1|true|yes|on) printf '1' ;;
    *) fail "$(message boolean_value "$name")" ;;
  esac
}

require_value() {
  local option="$1"
  local value="${2:-}"
  [ -n "$value" ] || fail "$(message option_requires_value "$option")"
}

cleanup() {
  if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
}

trap cleanup EXIT

CANARY="$(parse_bool PAPERCLIP_INSTALL_CANARY "${PAPERCLIP_INSTALL_CANARY:-}")"
VERSION="${PAPERCLIP_INSTALL_VERSION:-}"
REF="${PAPERCLIP_INSTALL_REF:-}"
REPO="${PAPERCLIP_INSTALL_REPO:-}"
NO_ONBOARD="$(parse_bool PAPERCLIP_INSTALL_NO_ONBOARD "${PAPERCLIP_INSTALL_NO_ONBOARD:-}")"
NO_PROMPT="$(parse_bool PAPERCLIP_INSTALL_NO_PROMPT "${PAPERCLIP_INSTALL_NO_PROMPT:-}")"
INSTALL_SERVICE="$(parse_bool PAPERCLIP_INSTALL_INSTALL_SERVICE "${PAPERCLIP_INSTALL_INSTALL_SERVICE:-}")"
DRY_RUN="$(parse_bool PAPERCLIP_INSTALL_DRY_RUN "${PAPERCLIP_INSTALL_DRY_RUN:-}")"
VERBOSE="$(parse_bool PAPERCLIP_INSTALL_VERBOSE "${PAPERCLIP_INSTALL_VERBOSE:-}")"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --canary)
      CANARY=1
      shift
      ;;
    --version)
      require_value "$1" "${2:-}"
      VERSION="$2"
      shift 2
      ;;
    --ref)
      require_value "$1" "${2:-}"
      REF="$2"
      shift 2
      ;;
    --repo)
      require_value "$1" "${2:-}"
      REPO="$2"
      shift 2
      ;;
    --no-onboard)
      NO_ONBOARD=1
      shift
      ;;
    --no-prompt)
      NO_PROMPT=1
      shift
      ;;
    --install-service)
      INSTALL_SERVICE=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --verbose)
      VERBOSE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    *)
      fail "$(message unknown_option "$1")"
      ;;
  esac
done

[ "$#" -eq 0 ] || fail "$(message unexpected_argument "$1")"

if [ "$CANARY" = "1" ] && [ -n "$VERSION" ]; then
  fail "$(message canary_version_conflict)"
fi

if [ -n "$REF" ] || [ -n "$REPO" ]; then
  fail "$(message git_ref_unsupported)"
fi

if { [ ! -t 0 ] || [ ! -t 1 ]; } && [ "$NO_PROMPT" != "1" ]; then
  fail "$(message noninteractive_requires_opt_in)"
fi

if [ "$VERBOSE" = "1" ]; then
  set -x
fi

OS="$(uname -s 2>/dev/null || true)"
ARCH="$(uname -m 2>/dev/null || true)"

case "$OS" in
  Darwin) OS_NAME="macos" ;;
  Linux) OS_NAME="linux" ;;
  *) fail "$(message unsupported_os "${OS:-unknown}")" ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH_NAME="x64" ;;
  arm64|aarch64) ARCH_NAME="arm64" ;;
  *) fail "$(message unsupported_arch "${ARCH:-unknown}")" ;;
esac

log "$(message detected "$OS_NAME/$ARCH_NAME")"

has_supported_node() {
  local version major minor patch
  command -v node >/dev/null 2>&1 || return 1
  version="$(node --version 2>/dev/null || true)"
  version="${version#v}"
  IFS=. read -r major minor patch <<< "$version"
  patch="${patch%%-*}"
  [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ && "$patch" =~ ^[0-9]+$ ]] || return 1
  if [ "$major" -lt "$MIN_NODE_MAJOR" ] ||
    { [ "$major" -eq "$MIN_NODE_MAJOR" ] && [ "$minor" -lt "$MIN_NODE_MINOR" ]; } ||
    { [ "$major" -eq "$MIN_NODE_MAJOR" ] && [ "$minor" -eq "$MIN_NODE_MINOR" ] && [ "$patch" -lt "$MIN_NODE_PATCH" ]; }; then
    return 1
  fi
  command -v npm >/dev/null 2>&1 || return 1
  command -v npx >/dev/null 2>&1 || return 1
}

print_command() {
  printf '[paperclip] +'
  printf ' %q' "$@"
  printf '\n'
}

confirm_command() {
  print_command "$@"
  if [ "$NO_PROMPT" = "1" ]; then
    return 0
  fi

  local answer
  printf '[paperclip] %s' "$(message run_command_prompt)" >/dev/tty
  IFS= read -r answer </dev/tty || answer=""
  case "$answer" in
    y|Y|yes|YES|Yes) ;;
    *) fail "$(message installation_cancelled)" ;;
  esac
}

run_command() {
  confirm_command "$@"
  "$@"
}

run_privileged() {
  if [ "$(id -u)" -eq 0 ]; then
    run_command "$@"
    return
  fi

  command -v sudo >/dev/null 2>&1 || fail "$(message sudo_required)"
  run_command sudo "$@"
}

ensure_temp_dir() {
  if [ -z "$TEMP_DIR" ]; then
    TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/paperclip-install.XXXXXX")"
  fi
}

download_checked_script() {
  local url="$1"
  local destination="$2"
  local expected_sha256="$3"
  local actual_sha256

  command -v curl >/dev/null 2>&1 || fail "$(message curl_required)"
  curl --proto '=https' --tlsv1.2 -fsSL "$url" -o "$destination"
  [ -s "$destination" ] || fail "$(message download_empty "$url")"
  if command -v sha256sum >/dev/null 2>&1; then
    actual_sha256="$(sha256sum "$destination" | awk '{print $1}')"
  elif command -v shasum >/dev/null 2>&1; then
    actual_sha256="$(shasum -a 256 "$destination" | awk '{print $1}')"
  else
    fail "$(message hash_tool_required)"
  fi
  [ "$actual_sha256" = "$expected_sha256" ] || fail "$(message checksum_mismatch "$url")"
  [ "$(head -c 2 "$destination")" = '#!' ] || fail "$(message not_script "$url")"
  bash -n "$destination" || fail "$(message syntax_invalid "$url")"
}

check_version_manager() {
  if [ -n "${NVM_DIR:-}" ] || [ -d "${HOME:-}/.nvm" ]; then
    fail "$(message nvm_detected "$DEFAULT_NODE_MAJOR")"
  fi
  if command -v asdf >/dev/null 2>&1 || [ -d "${HOME:-}/.asdf" ]; then
    fail "$(message asdf_detected "$DEFAULT_NODE_MAJOR")"
  fi
}

install_node_macos() {
  if ! command -v brew >/dev/null 2>&1; then
    ensure_temp_dir
    local brew_installer="$TEMP_DIR/homebrew-install.sh"
    log "$(message homebrew_required)"
    download_checked_script "https://raw.githubusercontent.com/Homebrew/install/$HOMEBREW_INSTALL_COMMIT/install.sh" "$brew_installer" "$HOMEBREW_INSTALL_SHA256"
    if [ "$NO_PROMPT" = "1" ]; then
      run_command env NONINTERACTIVE=1 /bin/bash "$brew_installer"
    else
      run_command /bin/bash "$brew_installer"
    fi

    if [ -x /opt/homebrew/bin/brew ]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -x /usr/local/bin/brew ]; then
      eval "$(/usr/local/bin/brew shellenv)"
    fi
  fi

  command -v brew >/dev/null 2>&1 || fail "$(message homebrew_not_on_path)"
  run_command brew install node
}

install_node_apt() {
  ensure_temp_dir
  local nodesource_installer="$TEMP_DIR/nodesource-setup.sh"
  run_privileged env DEBIAN_FRONTEND=noninteractive apt-get update
  run_privileged env DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl
  download_checked_script "https://raw.githubusercontent.com/nodesource/distributions/$NODESOURCE_DISTRIBUTIONS_COMMIT/scripts/deb/setup_${DEFAULT_NODE_MAJOR}.x" "$nodesource_installer" "$NODESOURCE_DEB_SHA256"
  run_privileged env DEBIAN_FRONTEND=noninteractive bash "$nodesource_installer"
  run_privileged env DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
}

install_node_dnf() {
  ensure_temp_dir
  local nodesource_installer="$TEMP_DIR/nodesource-setup.sh"
  run_privileged dnf install -y ca-certificates curl
  download_checked_script "https://raw.githubusercontent.com/nodesource/distributions/$NODESOURCE_DISTRIBUTIONS_COMMIT/scripts/rpm/setup_${DEFAULT_NODE_MAJOR}.x" "$nodesource_installer" "$NODESOURCE_RPM_SHA256"
  run_privileged bash "$nodesource_installer"
  run_privileged dnf install -y nodejs
}

install_node_linux() {
  if command -v apt-get >/dev/null 2>&1; then
    install_node_apt
  elif command -v dnf >/dev/null 2>&1; then
    install_node_dnf
  elif command -v pacman >/dev/null 2>&1; then
    run_privileged pacman -Sy --noconfirm --needed nodejs npm
  elif command -v apk >/dev/null 2>&1; then
    run_privileged apk add --no-cache nodejs npm
  else
    fail "$(message no_package_manager)"
  fi
}

if has_supported_node; then
  log "$(message using_node "$(node --version)")"
else
  if command -v node >/dev/null 2>&1; then
    log "$(message node_too_old "$(node --version 2>/dev/null || printf unknown)" "$MIN_NODE_VERSION")"
  else
    log "$(message node_not_found)"
  fi
  if [ "$PIPED_INSTALL" = "1" ]; then
    fail "$(message piped_bootstrap_disabled)"
  fi
  check_version_manager
  log "$(message installing_node "$DEFAULT_NODE_MAJOR")"
  if [ "$OS_NAME" = "macos" ]; then
    install_node_macos
  else
    install_node_linux
  fi
  has_supported_node || fail "$(message node_install_unavailable "$MIN_NODE_VERSION")"
  log "$(message installed_node "$(node --version)")"
fi

PACKAGE_SPEC="$PAPERCLIP_PACKAGE@latest"
if [ "$CANARY" = "1" ]; then
  PACKAGE_SPEC="$PAPERCLIP_PACKAGE@canary"
elif [ -n "$VERSION" ]; then
  PACKAGE_SPEC="$PAPERCLIP_PACKAGE@$VERSION"
fi

INSTALL_ARGS=(install)
[ "$CANARY" = "1" ] && INSTALL_ARGS+=(--canary)
[ -n "$VERSION" ] && INSTALL_ARGS+=(--version "$VERSION")
[ "$NO_PROMPT" = "1" ] && INSTALL_ARGS+=(--yes)
ensure_temp_dir
NPM_USERCONFIG="$TEMP_DIR/npmrc"
printf 'registry=%s\n@paperclipai:registry=%s\n' "$PUBLIC_NPM_REGISTRY" "$PUBLIC_NPM_REGISTRY" >"$NPM_USERCONFIG"
chmod 600 "$NPM_USERCONFIG"
NPM_ENV=(env "NPM_CONFIG_REGISTRY=$PUBLIC_NPM_REGISTRY" "npm_config_registry=$PUBLIC_NPM_REGISTRY" "NPM_CONFIG_USERCONFIG=$NPM_USERCONFIG" "npm_config_userconfig=$NPM_USERCONFIG")
INSTALL_COMMAND=("${NPM_ENV[@]}" npx --yes "--registry=$PUBLIC_NPM_REGISTRY" "$PACKAGE_SPEC" "${INSTALL_ARGS[@]}")

log "$(message delegating_cli)"
if [ "$DRY_RUN" = "1" ]; then
  print_command "${INSTALL_COMMAND[@]}"
  exit 0
fi

print_command "${INSTALL_COMMAND[@]}"
"${INSTALL_COMMAND[@]}"

if [ "$INSTALL_SERVICE" = "1" ]; then
  log "$(message installing_service)"
  print_command "${NPM_ENV[@]}" npx --yes "--registry=$PUBLIC_NPM_REGISTRY" "$PACKAGE_SPEC" service install
  "${NPM_ENV[@]}" npx --yes "--registry=$PUBLIC_NPM_REGISTRY" "$PACKAGE_SPEC" service install
fi

if [ "$NO_ONBOARD" = "0" ] && [ -t 0 ] && [ -t 1 ]; then
  if command -v paperclipai >/dev/null 2>&1; then
    exec paperclipai onboard
  elif [ -x "${HOME:-}/.local/bin/paperclipai" ]; then
    exec "${HOME}/.local/bin/paperclipai" onboard
  else
    fail "$(message installed_cli_not_on_path)"
  fi
fi

if [ "$NO_ONBOARD" = "0" ]; then
  log "$(message installation_complete_onboard)"
else
  log "$(message installation_complete)"
fi
