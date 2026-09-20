import { Group, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

/** 页面标题区：统一标题、说明与右侧操作按钮的位置。 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <div>
        <Title order={3}>{title}</Title>
        {description !== undefined && (
          <Text size="sm" c="dimmed" mt={4}>
            {description}
          </Text>
        )}
      </div>
      {actions}
    </Group>
  )
}
