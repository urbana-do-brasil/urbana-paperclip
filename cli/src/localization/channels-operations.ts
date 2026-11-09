import { getCliLocale } from "./index.js";
import type { ChannelName } from "../commands/channels.js";

const portugueseChannelCopy: Record<ChannelName, { cadence: string; audience: string }> = {
  stable: { cadence: "manual, após pelo menos 3 dias em beta", audience: "a versão recomendada para quase todas as pessoas" },
  beta: { cadence: "promoção manual sujeita a aprovação", audience: "versões candidatas que podem se tornar estáveis alguns dias depois" },
  nightly: { cadence: "uma vez por noite, após testes básicos", audience: "alterações do dia anterior, testadas em conjunto" },
  canary: { cadence: "a cada merge na master", audience: "as alterações mais recentes" },
};

export function channelPresentation(channel: ChannelName, original: { cadence: string; audience: string }) {
  return getCliLocale() === "pt-BR" ? portugueseChannelCopy[channel] : original;
}

const messages = {
  en: {
    title: "Paperclip release channels",
    unavailable: "unavailable",
    unknown: "This install reports version {version}, which does not map to a published channel (source checkouts report the repository placeholder).",
    current: "This install is version {version} on the {channel} channel.",
    docker: "Docker images use the same names: ghcr.io/paperclipai/paperclip:{latest,beta,nightly,canary}",
  },
  "pt-BR": {
    title: "Canais de lançamento do Paperclip",
    unavailable: "indisponível",
    unknown: "Esta instalação informa a versão {version}, que não corresponde a um canal publicado (checkouts do código usam a versão provisória do repositório).",
    current: "Esta instalação usa a versão {version} no canal {channel}.",
    docker: "As imagens Docker usam os mesmos nomes: ghcr.io/paperclipai/paperclip:{latest,beta,nightly,canary}",
  },
} as const;

export function channelsMessage(key: keyof typeof messages.en, values: Record<string, string> = {}): string {
  let result: string = messages[getCliLocale()][key];
  for (const [name, value] of Object.entries(values)) result = result.replaceAll(`{${name}}`, value);
  return result;
}
