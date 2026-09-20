import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from './layouts/AppLayout'
import { AgentsPage } from './pages/AgentsPage'
import { AuditPage } from './pages/AuditPage'
import { ConversationsPage } from './pages/ConversationsPage'
import { DashboardPage } from './pages/DashboardPage'
import { GrantsPage } from './pages/GrantsPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { ModelsPage } from './pages/ModelsPage'
import { OrgPage } from './pages/OrgPage'
import { PromptsPage } from './pages/PromptsPage'
import { RuntimePage } from './pages/RuntimePage'
import { SkillsPage } from './pages/SkillsPage'
import { ToolsPage } from './pages/ToolsPage'
import { UsagePage } from './pages/UsagePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: 'skills', element: <SkillsPage /> },
      { path: 'prompts', element: <PromptsPage /> },
      { path: 'tools', element: <ToolsPage /> },
      { path: 'grants', element: <GrantsPage /> },
      { path: 'org', element: <OrgPage /> },
      { path: 'knowledge', element: <KnowledgePage /> },
      { path: 'conversations', element: <ConversationsPage /> },
      { path: 'usage', element: <UsagePage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'runtime', element: <RuntimePage /> },
      { path: 'models', element: <ModelsPage /> },
    ],
  },
])
