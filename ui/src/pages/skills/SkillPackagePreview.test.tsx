// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkillTreeCandidate } from './SkillSourceTree';
import { SkillPackagePreview } from './SkillPackagePreview';
import { i18n } from '@/i18n';

const mocks = vi.hoisted(() => ({ preview: vi.fn() }));
vi.mock('@/api/skillSources', () => ({ skillSourcesApi: { preview: mocks.preview } }));

let root: Root;
let host: HTMLDivElement;
let client: QueryClient;
const skill: SkillTreeCandidate = {
  path: 'tools/review/SKILL.md',
  name: 'Code review',
  description: 'Review source code.',
  error: null,
  inspection: {
    files: [{ path: 'SKILL.md', kind: 'file', sizeBytes: 1234, encoding: 'utf8', executable: false }],
    requirements: 'Node.js 22 or newer',
    references: [{ fromPath: 'SKILL.md', target: './missing.md', resolvedPath: 'tools/review/missing.md', kind: 'missing' }],
    warnings: ['Author-provided audit detail'],
  },
};

beforeEach(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('pt-BR');
  vi.mocked(mocks.preview).mockResolvedValue({
    file: { path: 'SKILL.md', kind: 'file', sizeBytes: 1234, encoding: 'utf8', executable: false },
    content: '# Original skill content',
    truncated: false,
    commitSha: 'a'.repeat(40),
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  client?.clear();
  vi.clearAllMocks();
  await i18n.changeLanguage('en');
});

describe('skill package preview localization', () => {
  it('localizes its controls while preserving authored content, paths, and commit identity', async () => {
    await act(async () => root.render(
      <QueryClientProvider client={client}>
        <SkillPackagePreview
          companyId="company-1"
          repository={{ repositoryUrl: 'https://github.com/acme/team-skills', connectionId: 'connection-1' }}
          commitSha={'a'.repeat(40)}
          skill={skill}
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    ));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

    expect(document.body.textContent).toContain('Requisitos de execução');
    expect(document.body.textContent).toContain('Node.js 22 or newer');
    expect(document.body.querySelector('[aria-label="Avisos sobre referências do pacote"]')).not.toBeNull();
    expect(document.body.textContent).toContain('./missing.md');
    expect(document.body.textContent).toContain('Não encontrado');
    expect(document.body.textContent).toContain('Author-provided audit detail');
    expect(document.body.textContent).toContain('# Original skill content');
    expect(document.body.textContent).toContain('Voltar à seleção');
    expect(document.body.querySelector('[aria-label="Arquivos incluídos no pacote"]')).not.toBeNull();
    expect(mocks.preview).toHaveBeenCalledWith('company-1', expect.objectContaining({
      repositoryUrl: 'https://github.com/acme/team-skills',
      connectionId: 'connection-1',
      commitSha: 'a'.repeat(40),
      skillPath: 'tools/review/SKILL.md',
      filePath: 'SKILL.md',
    }));
  });
});
