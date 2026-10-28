import { getCliLocale } from "./index.js";

type DoctorCheckPresentation = {
  name: string;
  message: string;
  repairHint?: string;
};

type DiagnosticTranslation = {
  name: string;
  message?: string;
  ptMessage?: string;
  repairHint?: string;
  ptRepairHint?: string;
};

// These templates apply only while doctor prints a result. CheckResult objects
// keep their original English diagnostics, so callers and JSON data stay stable.
const diagnostics: DiagnosticTranslation[] = [
  { name: "Agent JWT secret", message: "PAPERCLIP_AGENT_JWT_SECRET is set in environment", ptMessage: "PAPERCLIP_AGENT_JWT_SECRET está definida no ambiente." },
  { name: "Agent JWT secret", message: "PAPERCLIP_AGENT_JWT_SECRET is present in {envPath} but not loaded into environment", ptMessage: "PAPERCLIP_AGENT_JWT_SECRET está presente em {envPath}, mas não foi carregada no ambiente.", repairHint: "Set the value from {envPath} in your shell before starting the Paperclip server", ptRepairHint: "Defina no shell o valor de {envPath} antes de iniciar o servidor Paperclip." },
  { name: "Agent JWT secret", message: "PAPERCLIP_AGENT_JWT_SECRET missing from environment and {envPath}", ptMessage: "PAPERCLIP_AGENT_JWT_SECRET não foi encontrada no ambiente nem em {envPath}.", repairHint: "Run with --repair to create {envPath} containing PAPERCLIP_AGENT_JWT_SECRET", ptRepairHint: "Execute com --repair para criar {envPath} com PAPERCLIP_AGENT_JWT_SECRET." },

  { name: "Config file", message: "Config file not found at {filePath}", ptMessage: "Arquivo de configuração não encontrado em {filePath}.", repairHint: "Run `paperclipai onboard` to create one", ptRepairHint: "Execute `paperclipai onboard` para criar o arquivo." },
  { name: "Config file", message: "Valid config at {filePath}", ptMessage: "Configuração válida em {filePath}." },
  { name: "Config file", message: "Invalid config: {detail}", ptMessage: "Configuração inválida: {detail}", repairHint: "Run `paperclipai configure --section database` (or `paperclipai onboard` to recreate)", ptRepairHint: "Execute `paperclipai configure --section database` (ou `paperclipai onboard` para recriar)." },

  { name: "Database", message: "PostgreSQL mode selected but no connection string configured", ptMessage: "O modo PostgreSQL foi selecionado, mas nenhuma string de conexão foi configurada.", repairHint: "Run `paperclipai configure --section database`", ptRepairHint: "Execute `paperclipai configure --section database`." },
  { name: "Database", message: "PostgreSQL connection successful", ptMessage: "Conexão com o PostgreSQL estabelecida." },
  { name: "Database", message: "Cannot connect to PostgreSQL: {detail}", ptMessage: "Não foi possível conectar ao PostgreSQL: {detail}", repairHint: "Check your connection string and ensure PostgreSQL is running", ptRepairHint: "Verifique a string de conexão e confirme que o PostgreSQL está em execução." },
  {
    name: "Database",
    message: "Embedded PostgreSQL data dir is inside the OS temp directory ({dataDir}) while running in worktree mode (PAPERCLIP_IN_WORKTREE=true). Data stored here is ephemeral and will be lost on reboot or a temp cleanup. If this is your primary instance, PAPERCLIP_HOME / PAPERCLIP_IN_WORKTREE likely leaked into its environment, pointing it at a throwaway worktree home instead of your real data.",
    ptMessage: "O diretório de dados do PostgreSQL integrado está dentro do diretório temporário do sistema operacional ({dataDir}) durante a execução em modo worktree (PAPERCLIP_IN_WORKTREE=true). Os dados armazenados aqui são temporários e serão perdidos na reinicialização ou na limpeza dos arquivos temporários. Se esta for sua instância principal, PAPERCLIP_HOME / PAPERCLIP_IN_WORKTREE provavelmente vazaram para o ambiente e apontaram a instância para um diretório worktree descartável em vez dos dados reais.",
    repairHint: "If this is the primary instance, unset PAPERCLIP_HOME and PAPERCLIP_IN_WORKTREE (or pass --data-dir <persistent path>) and restart so it uses the persistent instance.",
    ptRepairHint: "Se esta for a instância principal, remova PAPERCLIP_HOME e PAPERCLIP_IN_WORKTREE do ambiente (ou passe --data-dir <persistent path>) e reinicie para usar a instância persistente.",
  },
  { name: "Database", message: "Embedded PostgreSQL configured at {dataDir} (port {port})", ptMessage: "PostgreSQL integrado configurado em {dataDir} (porta {port})." },
  { name: "Database", message: "Unknown database mode: {mode}", ptMessage: "Modo de banco de dados desconhecido: {mode}", repairHint: "Run `paperclipai configure --section database`", ptRepairHint: "Execute `paperclipai configure --section database`." },

  { name: "Deployment/auth mode", message: "local_trusted requires loopback binding (found {bind})", ptMessage: "local_trusted exige uma interface loopback (encontrada: {bind}).", repairHint: "Run `paperclipai configure --section server` and choose Local trusted / loopback reachability", ptRepairHint: "Execute `paperclipai configure --section server` e selecione Local trusted / acesso por loopback." },
  { name: "Deployment/auth mode", message: "local_trusted mode is configured for loopback-only access", ptMessage: "O modo local_trusted está configurado para acesso somente por loopback." },
  { name: "Deployment/auth mode", message: "authenticated mode requires BETTER_AUTH_SECRET (or PAPERCLIP_AGENT_JWT_SECRET)", ptMessage: "O modo authenticated exige BETTER_AUTH_SECRET (ou PAPERCLIP_AGENT_JWT_SECRET).", repairHint: "Set BETTER_AUTH_SECRET before starting Paperclip", ptRepairHint: "Defina BETTER_AUTH_SECRET antes de iniciar o Paperclip." },
  { name: "Deployment/auth mode", message: "auth.baseUrlMode=explicit requires auth.publicBaseUrl", ptMessage: "auth.baseUrlMode=explicit exige auth.publicBaseUrl.", repairHint: "Run `paperclipai configure --section server` and provide a base URL", ptRepairHint: "Execute `paperclipai configure --section server` e informe uma URL base." },
  { name: "Deployment/auth mode", message: "authenticated/public requires explicit auth.publicBaseUrl", ptMessage: "authenticated/public exige que auth.publicBaseUrl seja explícita.", repairHint: "Run `paperclipai configure --section server` and select public exposure", ptRepairHint: "Execute `paperclipai configure --section server` e selecione exposição pública." },
  { name: "Deployment/auth mode", message: "Public exposure should use an https:// auth.publicBaseUrl", ptMessage: "Para exposição pública, use uma auth.publicBaseUrl com https://.", repairHint: "Use HTTPS in production for secure session cookies", ptRepairHint: "Use HTTPS em produção para proteger os cookies de sessão." },
  { name: "Deployment/auth mode", message: "auth.publicBaseUrl is not a valid URL", ptMessage: "auth.publicBaseUrl não é uma URL válida.", repairHint: "Run `paperclipai configure --section server` and provide a valid URL", ptRepairHint: "Execute `paperclipai configure --section server` e informe uma URL válida." },
  { name: "Deployment/auth mode", message: "Mode {mode}/{exposure} with bind {bind} and auth URL mode {baseUrlMode}", ptMessage: "Modo {mode}/{exposure}, interface {bind} e modo da URL de autenticação {baseUrlMode}." },

  { name: "LLM provider", message: "No LLM provider configured (optional)", ptMessage: "Nenhum provedor de LLM configurado (opcional)." },
  { name: "LLM provider", message: "{provider} configured but no API key set (optional)", ptMessage: "{provider} está configurado, mas nenhuma chave de API foi definida (opcional)." },
  { name: "LLM provider", message: "Claude API key is valid", ptMessage: "A chave de API do Claude é válida." },
  { name: "LLM provider", message: "Claude API key is invalid (401)", ptMessage: "A chave de API do Claude é inválida (401).", repairHint: "Run `paperclipai configure --section llm`", ptRepairHint: "Execute `paperclipai configure --section llm`." },
  { name: "LLM provider", message: "Claude API returned status {status}", ptMessage: "A API do Claude retornou o status {status}." },
  { name: "LLM provider", message: "OpenAI API key is valid", ptMessage: "A chave de API da OpenAI é válida." },
  { name: "LLM provider", message: "OpenAI API key is invalid (401)", ptMessage: "A chave de API da OpenAI é inválida (401).", repairHint: "Run `paperclipai configure --section llm`", ptRepairHint: "Execute `paperclipai configure --section llm`." },
  { name: "LLM provider", message: "OpenAI API returned status {status}", ptMessage: "A API da OpenAI retornou o status {status}." },
  { name: "LLM provider", message: "Could not reach API to validate key", ptMessage: "Não foi possível acessar a API para validar a chave." },

  { name: "Log directory", message: "Log directory is writable: {path}", ptMessage: "O diretório de logs permite gravação: {path}." },
  { name: "Log directory", message: "Log directory is not writable: {path}", ptMessage: "Não é possível gravar no diretório de logs: {path}.", repairHint: "Check file permissions on the log directory", ptRepairHint: "Verifique as permissões de acesso ao diretório de logs." },

  { name: "Node.js runtime", message: "Node.js {version} is unsupported", ptMessage: "A versão {version} do Node.js não é compatível.", repairHint: "Install Node.js {minimum} or newer before installing or running Paperclip", ptRepairHint: "Instale o Node.js {minimum} ou mais recente antes de instalar ou executar o Paperclip." },
  { name: "Managed install", message: "Not present (optional for npx, global npm, and source-checkout usage)", ptMessage: "Não encontrada (opcional ao usar npx, npm global ou uma cópia do código-fonte)." },
  { name: "Managed install manifest", message: "Managed install artifacts exist but {path} is missing", ptMessage: "Há arquivos de instalação gerenciada, mas falta {path}.", repairHint: "Re-run `paperclipai install`", ptRepairHint: "Execute novamente `paperclipai install`." },
  { name: "Managed install store", message: "{source} {version} is active", ptMessage: "{source} {version} está ativa." },
  { name: "Managed install store", message: "Manifest payload is missing or outside the install store: {path}", ptMessage: "O payload do manifesto não existe ou está fora do armazenamento de instalação: {path}", repairHint: "Re-run `paperclipai install` or roll back to a retained payload", ptRepairHint: "Execute novamente `paperclipai install` ou reverta para um payload retido." },
  { name: "Managed install store", message: "Current link does not point to {path}", ptMessage: "O link atual não aponta para {path}.", repairHint: "Re-run `paperclipai install` or roll back to a retained payload", ptRepairHint: "Execute novamente `paperclipai install` ou reverta para um payload retido." },
  { name: "Managed install shim", message: "Missing or unrecognized shim at {path}", ptMessage: "Shim ausente ou não reconhecido em {path}.", repairHint: "Re-run `paperclipai install`", ptRepairHint: "Execute novamente `paperclipai install`." },
  { name: "Managed install PATH", message: "{directory} is on PATH", ptMessage: "{directory} está no PATH." },
  { name: "Managed install PATH", message: "{directory} is not on PATH", ptMessage: "{directory} não está no PATH.", repairHint: 'Run `export PATH="$HOME/.local/bin:$PATH"` and add it to your shell startup file', ptRepairHint: 'Execute `export PATH="$HOME/.local/bin:$PATH"` e adicione o comando ao arquivo de inicialização do shell.' },
  { name: "Managed install retention", message: "No orphaned payloads", ptMessage: "Nenhum payload órfão encontrado." },
  { name: "Managed install retention", message: "{count} orphaned payload found", ptMessage: "{count} payload órfão encontrado.", repairHint: "A successful `paperclipai update` prunes unretained payloads", ptRepairHint: "Uma execução bem-sucedida de `paperclipai update` remove os payloads não retidos." },
  { name: "Managed install retention", message: "{count} orphaned payloads found", ptMessage: "{count} payloads órfãos encontrados.", repairHint: "A successful `paperclipai update` prunes unretained payloads", ptRepairHint: "Uma execução bem-sucedida de `paperclipai update` remove os payloads não retidos." },

  { name: "Server port", message: "Port {port} is available", ptMessage: "A porta {port} está disponível." },
  { name: "Server port", message: "Port {port} is not available", ptMessage: "A porta {port} não está disponível.", repairHint: "Check what's using port {port} with: lsof -i :{port}", ptRepairHint: "Verifique o que está usando a porta {port} com: lsof -i :{port}" },

  { name: "Secrets adapter", message: "{provider} is configured, but this build only supports local_encrypted and aws_secrets_manager", ptMessage: "{provider} está configurado, mas esta compilação só oferece suporte a local_encrypted e aws_secrets_manager.", repairHint: "Run `paperclipai configure --section secrets` and choose local_encrypted or aws_secrets_manager", ptRepairHint: "Execute `paperclipai configure --section secrets` e selecione local_encrypted ou aws_secrets_manager." },
  { name: "Secrets adapter", message: "PAPERCLIP_SECRETS_MASTER_KEY is invalid (expected 32-byte base64, 64-char hex, or raw 32-char string)", ptMessage: "PAPERCLIP_SECRETS_MASTER_KEY é inválida (esperado: base64 de 32 bytes, 64 caracteres hexadecimais ou texto puro de 32 caracteres).", repairHint: "Set PAPERCLIP_SECRETS_MASTER_KEY to a valid key or unset it to use a key file", ptRepairHint: "Defina PAPERCLIP_SECRETS_MASTER_KEY com uma chave válida ou remova-a do ambiente para usar um arquivo de chave." },
  { name: "Secrets adapter", message: "Local encrypted provider configured via PAPERCLIP_SECRETS_MASTER_KEY", ptMessage: "Provedor de criptografia local configurado por PAPERCLIP_SECRETS_MASTER_KEY." },
  { name: "Secrets adapter", message: "Secrets key file does not exist yet: {path}", ptMessage: "O arquivo da chave de segredos ainda não existe: {path}.", repairHint: "Run with --repair to create a local encrypted secrets key file", ptRepairHint: "Execute com --repair para criar um arquivo local de chave de segredos criptografada." },
  { name: "Secrets adapter", message: "Could not read secrets key file: {detail}", ptMessage: "Não foi possível ler o arquivo da chave de segredos: {detail}", repairHint: "Check file permissions or set PAPERCLIP_SECRETS_MASTER_KEY", ptRepairHint: "Verifique as permissões do arquivo ou defina PAPERCLIP_SECRETS_MASTER_KEY." },
  { name: "Secrets adapter", message: "Invalid key material in {path}", ptMessage: "O conteúdo da chave em {path} é inválido.", repairHint: "Replace with valid key material or delete it and run doctor --repair", ptRepairHint: "Substitua por um conteúdo de chave válido ou remova o arquivo e execute doctor --repair." },
  { name: "Secrets adapter", message: "Local encrypted provider configured with key file {path}", ptMessage: "Provedor de criptografia local configurado com o arquivo de chave {path}." },
  { name: "Secrets adapter", message: "Local encrypted provider configured with key file {path}; key file permissions are {mode} (run chmod 600 {path})", ptMessage: "Provedor de criptografia local configurado com o arquivo de chave {path}; as permissões do arquivo são {mode} (execute chmod 600 {path})", repairHint: "Restrict the local encrypted secrets key file to owner read/write permissions", ptRepairHint: "Restrinja as permissões do arquivo local de chave de segredos para leitura e gravação somente pelo proprietário." },
  { name: "Secrets adapter", message: "AWS Secrets Manager provider is missing non-secret config: {missing}", ptMessage: "Faltam configurações não secretas do provedor AWS Secrets Manager: {missing}", repairHint: "Set {missing} in the Paperclip server runtime. Provide AWS runtime credentials through the AWS SDK default credential chain: IAM role/workload identity, AWS_PROFILE/SSO/shared credentials, web identity, container/instance metadata, or short-lived shell credentials. Do not store AWS root credentials or long-lived IAM user keys in Paperclip secrets.", ptRepairHint: "Defina {missing} no ambiente de execução do servidor Paperclip. Forneça as credenciais AWS em runtime pela cadeia padrão do SDK da AWS: função IAM/identidade de workload, AWS_PROFILE/SSO/credenciais compartilhadas, identidade web, metadados de contêiner/instância ou credenciais temporárias do shell. Não armazene credenciais raiz da AWS nem chaves IAM de longa duração nos segredos do Paperclip." },
  { name: "Secrets adapter", message: "AWS Secrets Manager provider configured for deployment {deployment}; runtime credentials source: {source}", ptMessage: "Provedor AWS Secrets Manager configurado para a implantação {deployment}; origem das credenciais em runtime: {source}." },
  { name: "Secrets adapter", message: "AWS static environment credentials are visible. Use only short-lived shell credentials locally; prefer IAM role/workload identity for hosted deployments and never store AWS access keys in Paperclip company secrets.", ptMessage: "Credenciais estáticas da AWS no ambiente estão visíveis. Use apenas credenciais temporárias do shell localmente; prefira função IAM/identidade de workload em implantações hospedadas e nunca armazene chaves de acesso da AWS nos segredos da empresa no Paperclip.", repairHint: "AWS static environment credentials are visible. Use only short-lived shell credentials locally; prefer IAM role/workload identity for hosted deployments and never store AWS access keys in Paperclip company secrets.", ptRepairHint: "Credenciais estáticas da AWS no ambiente estão visíveis. Use apenas credenciais temporárias do shell localmente; prefira função IAM/identidade de workload em implantações hospedadas e nunca armazene chaves de acesso da AWS nos segredos da empresa no Paperclip." },
  { name: "Secrets adapter", repairHint: "Consider enabling secrets.strictMode", ptRepairHint: "Considere ativar secrets.strictMode." },

  { name: "Background service", message: "Service management is not supported on {platform}. Use paperclipai run instead.", ptMessage: "O gerenciamento de serviços não é compatível com {platform}. Use paperclipai run." },
  { name: "Background service", message: "No usable systemd user manager was detected (common in containers and WSL1). Use paperclipai run instead.", ptMessage: "Nenhum gerenciador systemd de usuário utilizável foi detectado (algo comum em contêineres e no WSL1). Use paperclipai run." },
  { name: "Background service", message: "Not installed for instance {instance} (optional)", ptMessage: "Não instalado para a instância {instance} (opcional)." },
  { name: "Service definition", message: "Missing or drifted definition at {path}", ptMessage: "Definição ausente ou divergente em {path}.", repairHint: "Run `paperclipai service install` to regenerate the service definition", ptRepairHint: "Execute `paperclipai service install` para gerar novamente a definição do serviço." },
  { name: "Service runtime", message: "{serviceName} is active", ptMessage: "{serviceName} está ativo." },
  { name: "Service runtime", message: "{serviceName} cannot start: no executable exists at {path}", ptMessage: "{serviceName} não pode iniciar: não existe um executável em {path}", repairHint: "Run `paperclipai install` to restore the managed payload and shim, then `paperclipai service start`", ptRepairHint: "Execute `paperclipai install` para restaurar o payload e o shim gerenciados; depois, execute `paperclipai service start`." },
  { name: "Service runtime", message: "{serviceName} cannot start: no executable exists at {path}", ptMessage: "{serviceName} não pode iniciar: não existe um executável em {path}", repairHint: "Restore the executable at {path}, or unset PAPERCLIP_SHIM_PATH and run `paperclipai install` followed by `paperclipai service install` to re-point the service at the managed shim", ptRepairHint: "Restaure o executável em {path} ou remova PAPERCLIP_SHIM_PATH do ambiente e execute `paperclipai install` seguido de `paperclipai service install` para apontar o serviço ao shim gerenciado." },
  { name: "Service runtime", message: "{serviceName} is inactive but the configured port is serving another Paperclip process", ptMessage: "{serviceName} está inativo, mas há outro processo do Paperclip atendendo na porta configurada.", repairHint: "Run `paperclipai service start`, or stop the conflicting foreground process first", ptRepairHint: "Execute `paperclipai service start` ou encerre primeiro o processo em primeiro plano que está em conflito." },
  { name: "Service runtime", message: "{serviceName} is {state}", ptMessage: "O estado de {serviceName} é {state}.", repairHint: "Run `paperclipai service start`; inspect `paperclipai service logs` if it does not stay up", ptRepairHint: "Execute `paperclipai service start`; se o serviço não permanecer ativo, consulte `paperclipai service logs`." },
  { name: "Service health", message: "Health endpoint did not report ok", ptMessage: "O endpoint de saúde não informou estado ok.", repairHint: "Inspect `paperclipai service status` and `paperclipai service logs`", ptRepairHint: "Consulte `paperclipai service status` e `paperclipai service logs`." },
  { name: "Service health", message: "Healthy", ptMessage: "Saudável." },
  { name: "Service health", message: "Healthy at version {version}", ptMessage: "Saudável na versão {version}." },
  { name: "Service health", message: "The configured port answers healthy, but not from {serviceName} — the service is inactive", ptMessage: "A porta configurada responde como saudável, mas não por meio de {serviceName} — o serviço está inativo." },
  { name: "Service health", message: "The configured port answers healthy (version {version}), but not from {serviceName} — the service is inactive", ptMessage: "A porta configurada responde como saudável (versão {version}), mas não por meio de {serviceName} — o serviço está inativo." },
  { name: "Service health", message: "{detail}", ptMessage: "{detail}", repairHint: "Inspect `paperclipai service status` and `paperclipai service logs`", ptRepairHint: "Consulte `paperclipai service status` e `paperclipai service logs`." },
  { name: "Service version", message: "Running {running}; managed install is {expected}", ptMessage: "Em execução: {running}; instalação gerenciada: {expected}.", repairHint: "Run `paperclipai service restart --expected-version {expected}", ptRepairHint: "Execute `paperclipai service restart --expected-version {expected}`." },
  { name: "Service linger", message: "Start-on-login is enabled but systemd user lingering is off", ptMessage: "A inicialização no login está ativada, mas o linger do usuário systemd está desativado.", repairHint: "Re-run `paperclipai service install --enable-linger` if the service must survive logout", ptRepairHint: "Execute novamente `paperclipai service install --enable-linger` se o serviço precisar continuar após sair da sessão." },

  { name: "Storage", message: "Local disk storage is writable: {path}", ptMessage: "O armazenamento em disco local permite gravação: {path}." },
  { name: "Storage", message: "Local storage directory is not writable: {path}", ptMessage: "Não é possível gravar no diretório de armazenamento local: {path}.", repairHint: "Check file permissions for storage.localDisk.baseDir", ptRepairHint: "Verifique as permissões de acesso configuradas em storage.localDisk.baseDir." },
  { name: "Storage", message: "S3 storage requires non-empty bucket and region", ptMessage: "O armazenamento S3 exige bucket e região preenchidos.", repairHint: "Run `paperclipai configure --section storage`", ptRepairHint: "Execute `paperclipai configure --section storage`." },
  { name: "Storage", message: "S3 storage configured (bucket={bucket}, region={region}). Reachability check is skipped in doctor.", ptMessage: "Armazenamento S3 configurado (bucket={bucket}, região={region}). O doctor não verifica a conectividade.", repairHint: "Verify credentials and endpoint in deployment environment", ptRepairHint: "Verifique as credenciais e o endpoint no ambiente de implantação." },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchTemplate(template: string, value: string): Record<string, string> | undefined {
  const names: string[] = [];
  const source = template.split(/(\{[A-Za-z][A-Za-z0-9]*\})/g).map((part) => {
    const placeholder = part.match(/^\{([A-Za-z][A-Za-z0-9]*)\}$/);
    if (placeholder) {
      names.push(placeholder[1]!);
      return "([\\s\\S]*?)";
    }
    return escapeRegExp(part);
  }).join("");
  const match = new RegExp(`^${source}$`).exec(value);
  if (!match) return undefined;
  return Object.fromEntries(names.map((name, index) => [name, match[index + 1]!]));
}

function formatTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_match, name: string) => values[name] ?? `{${name}}`);
}

function translateField(
  name: string,
  value: string | undefined,
  field: "message" | "repairHint",
): string | undefined {
  if (value === undefined) return undefined;
  for (const entry of diagnostics) {
    if (entry.name !== name) continue;
    const template = field === "message" ? entry.message : entry.repairHint;
    const translation = field === "message" ? entry.ptMessage : entry.ptRepairHint;
    if (template === undefined || translation === undefined) continue;
    const values = matchTemplate(template, value);
    if (values) return formatTemplate(translation, values);
  }
  return value;
}

/** Localize the human-facing doctor line without changing the CheckResult data. */
export function localizeDoctorCheckPresentation<T extends DoctorCheckPresentation>(result: T): T {
  if (getCliLocale() !== "pt-BR") return result;

  let message = result.message;
  let repairHint = result.repairHint;
  const strictModeMessageSuffix = "; strict secret mode is disabled for postgres deployment";
  const strictModeHintSuffix = ". Consider enabling secrets.strictMode";
  const strictModeNote = result.name === "Secrets adapter" && message.endsWith(strictModeMessageSuffix);
  const strictModeBaseMessageHasPeriod = strictModeNote && message.slice(0, -strictModeMessageSuffix.length).endsWith(".");
  if (strictModeNote) message = message.slice(0, -strictModeMessageSuffix.length);
  const strictModeHint = result.name === "Secrets adapter" && repairHint?.endsWith(strictModeHintSuffix);
  const strictModeBaseHintHasPeriod = strictModeHint && repairHint!.slice(0, -strictModeHintSuffix.length).endsWith(".");
  if (strictModeHint) repairHint = repairHint!.slice(0, -strictModeHintSuffix.length);

  let localizedMessage = translateField(result.name, message, "message");
  const localizedHint = translateField(result.name, repairHint, "repairHint");
  if (strictModeNote && !strictModeBaseMessageHasPeriod) localizedMessage = localizedMessage?.replace(/\.$/, "");
  const strictModeHintText = strictModeHint
    ? `${localizedHint}${strictModeBaseHintHasPeriod ? " " : ". "}Considere ativar secrets.strictMode.`
    : localizedHint;
  return {
    ...result,
    message: strictModeNote ? `${localizedMessage}; o modo estrito de segredos está desativado para a implantação PostgreSQL` : localizedMessage!,
    ...(strictModeHintText === undefined ? {} : { repairHint: strictModeHintText }),
  };
}
