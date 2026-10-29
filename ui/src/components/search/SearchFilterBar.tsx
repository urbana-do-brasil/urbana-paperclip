import { useMemo } from "react";
import { User, UserX } from "lucide-react";
import {
  COMPANY_SEARCH_UPDATED_WITHIN_OPTIONS,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  type CompanySearchFilterOptionCounts,
  type CompanySearchSort,
  type IssueStatus,
} from "@paperclipai/shared";
import { StatusIcon } from "@/components/StatusIcon";
import { PriorityIcon } from "@/components/PriorityIcon";
import { SHOW_TASK_PRIORITY_UI } from "@/lib/ui-flags";
import { useTranslation } from "@/i18n";
import { SearchFilterMenu, type FilterMenuOption } from "./SearchFilterMenu";
import { SearchSortMenu } from "./SearchSortMenu";
import {
  applyAssigneeToken,
  assigneeToken,
  updatedWithinLabel,
  type SearchFilters,
} from "@/lib/search-filters";
import type { TFunction } from "i18next";

export interface SearchFilterAgent {
  id: string;
  name: string;
}
export interface SearchFilterProject {
  id: string;
  name: string;
}
export interface SearchFilterLabel {
  id: string;
  name: string;
  color: string;
}

export interface SearchFilterDataProps {
  counts?: CompanySearchFilterOptionCounts;
  agents: SearchFilterAgent[];
  projects: SearchFilterProject[];
  labels: SearchFilterLabel[];
  currentUserId: string | null;
}

// Non-terminal statuses — the single-click "Open items" preset from wireframe screen 2.
const OPEN_STATUS_PRESET: IssueStatus[] = ISSUE_STATUSES.filter(
  (status) => status !== "done" && status !== "cancelled",
);

function humanize(value: string, dimension: "status" | "priority", t: TFunction): string {
  const keyByStatus: Record<string, string> = { in_progress: "inProgress", in_review: "inReview" };
  const key = dimension === "status" ? keyByStatus[value] ?? value : value;
  const fallback = value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  return t(`taskCollection.filters.${dimension}.${key}`, { defaultValue: fallback });
}

function count(record: Record<string, number> | undefined, key: string): number | undefined {
  return record?.[key];
}

export interface SearchFilterOptionGroups {
  status: FilterMenuOption[];
  priority: FilterMenuOption[];
  assignee: FilterMenuOption[];
  project: FilterMenuOption[];
  label: FilterMenuOption[];
  updated: FilterMenuOption[];
}

/** Build option lists (with filter-aware counts) shared by the desktop bar and mobile sheet. */
export function buildSearchFilterOptions({
  counts,
  agents,
  projects,
  labels,
  currentUserId,
}: SearchFilterDataProps, t: TFunction): SearchFilterOptionGroups {
  const status: FilterMenuOption[] = ISSUE_STATUSES.map((value) => ({
    value,
    label: humanize(value, "status", t),
    icon: <StatusIcon status={value} />,
    count: count(counts?.status as Record<string, number> | undefined, value),
  }));

  const priority: FilterMenuOption[] = ISSUE_PRIORITIES.map((value) => ({
    value,
    label: humanize(value, "priority", t),
    icon: <PriorityIcon priority={value} />,
    count: count(counts?.priority as Record<string, number> | undefined, value),
  }));

  const assignee: FilterMenuOption[] = [];
  if (currentUserId) {
    assignee.push({
      value: "me",
      label: t("globalSearch.filters.me"),
      icon: <User className="h-3.5 w-3.5 text-muted-foreground" />,
      count: count(counts?.assigneeUserId, currentUserId),
      searchText: "me mine",
    });
  }
  assignee.push({
    value: "none",
    label: t("globalSearch.filters.unassigned"),
    icon: <UserX className="h-3.5 w-3.5 text-muted-foreground" />,
    searchText: "unassigned none nobody",
  });
  for (const agent of agents) {
    assignee.push({
      value: `agent:${agent.id}`,
      label: agent.name,
      count: count(counts?.assigneeAgentId, agent.id),
      searchText: agent.name,
    });
  }

  const project: FilterMenuOption[] = projects.map((item) => ({
    value: item.id,
    label: item.name,
    count: count(counts?.projectId, item.id),
    searchText: item.name,
  }));

  const label: FilterMenuOption[] = labels.map((item) => ({
    value: item.id,
    label: item.name,
    swatch: item.color,
    count: count(counts?.labelId, item.id),
    searchText: item.name,
  }));

  const updated: FilterMenuOption[] = COMPANY_SEARCH_UPDATED_WITHIN_OPTIONS.map((value) => ({
    value,
    label: updatedWithinLabel(value, t),
    count: count(counts?.updatedWithin as Record<string, number> | undefined, value),
  }));

  return { status, priority, assignee, project, label, updated };
}

export function SearchFilterBar({
  filters,
  onChange,
  sort,
  onSortChange,
  data,
}: {
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
  sort: CompanySearchSort;
  onSortChange: (next: CompanySearchSort) => void;
  data: SearchFilterDataProps;
}) {
  const { t } = useTranslation();
  const options = useMemo(() => buildSearchFilterOptions(data, t), [data, t]);

  function toggleMulti(dimension: "status" | "priority", value: string) {
    const current = (filters[dimension] ?? []) as string[];
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];
    onChange({ ...filters, [dimension]: next });
  }

  const selectedAssignee = assigneeToken(filters, data.currentUserId);

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="search-filter-bar">
      <SearchFilterMenu
        label={t("globalSearch.filters.status")}
        multi
        options={options.status}
        selected={filters.status ?? []}
        onToggle={(value) => toggleMulti("status", value)}
        onClear={() => onChange({ ...filters, status: [] })}
        presets={[{ label: t("globalSearch.filters.openItems"), values: OPEN_STATUS_PRESET }]}
      />
      <SearchFilterMenu
        label={t("globalSearch.filters.assignee")}
        options={options.assignee}
        selected={selectedAssignee ? [selectedAssignee] : []}
        onSelect={(value) => onChange(applyAssigneeToken(filters, value, data.currentUserId))}
        searchable
        searchPlaceholder={t("globalSearch.filters.searchAssignees")}
        emptyMessage={t("globalSearch.filters.noAssignees")}
      />
      <SearchFilterMenu
        label={t("globalSearch.filters.project")}
        options={options.project}
        selected={filters.projectId ? [filters.projectId] : []}
        onSelect={(value) => onChange({ ...filters, projectId: value })}
        searchable
        searchPlaceholder={t("globalSearch.filters.searchProjects")}
        emptyMessage={t("globalSearch.filters.noProjects")}
      />
      <SearchFilterMenu
        label={t("globalSearch.filters.label")}
        options={options.label}
        selected={filters.labelId ? [filters.labelId] : []}
        onSelect={(value) => onChange({ ...filters, labelId: value })}
        searchable
        searchPlaceholder={t("globalSearch.filters.searchLabels")}
        emptyMessage={t("globalSearch.filters.noLabels")}
      />
      {/* PAP-411: Priority filter menu hidden behind SHOW_TASK_PRIORITY_UI (search DSL stays intact). */}
      {SHOW_TASK_PRIORITY_UI && (
      <SearchFilterMenu
        label={t("globalSearch.filters.priority")}
        multi
        options={options.priority}
        selected={filters.priority ?? []}
        onToggle={(value) => toggleMulti("priority", value)}
        onClear={() => onChange({ ...filters, priority: [] })}
      />
      )}
      <SearchFilterMenu
        label={t("globalSearch.filters.updated")}
        options={options.updated}
        selected={filters.updatedWithin ? [filters.updatedWithin] : []}
        onSelect={(value) => onChange({ ...filters, updatedWithin: value })}
      />
      <div className="ml-auto">
        <SearchSortMenu value={sort} onChange={onSortChange} />
      </div>
    </div>
  );
}
