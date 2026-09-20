import { AppShell, Badge, Group, NavLink, Text } from '@mantine/core'
import { Link, Outlet, useLocation } from 'react-router-dom'

import styles from './AppLayout.module.css'

const NAV_ITEMS = [
  { to: '/', label: '概览' },
  { to: '/agents', label: '智能体' },
] as const

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 220, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Text fw={700} className={styles.brand}>
              企业 Agent 平台
            </Text>
            <Badge variant="light" size="sm">
              M0 骨架
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            管理员
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            active={pathname === item.to}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
