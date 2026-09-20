import { Alert, Badge, Card, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'

import { systemApi } from '@/api/system'
import { formatDateTime } from '@/utils/datetime'

export function DashboardPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ['system', 'status'],
    queryFn: systemApi.status,
  })

  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>概览</Title>
        <Text size="sm" c="dimmed">
          M0 阶段只验证前后端连通与工程规范，业务数据在 M2 之后接入。
        </Text>
      </div>

      <Card withBorder padding="lg" radius="md">
        <Group justify="space-between" mb="xs">
          <Text fw={600}>后端连通性</Text>
          {isPending && <Loader size="xs" />}
          {!isPending && !error && (
            <Badge color="teal" variant="light">
              已连通
            </Badge>
          )}
          {error && (
            <Badge color="red" variant="light">
              连接失败
            </Badge>
          )}
        </Group>

        {error && (
          <Alert color="red" title="后端未响应" variant="light">
            确认后端已在 8090 端口启动（<code>mvn spring-boot:run</code>）。
          </Alert>
        )}

        {data && (
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Field label="应用名" value={data.name} />
            <Field label="版本" value={data.version} />
            <Field label="服务器时间" value={formatDateTime(data.time)} />
          </SimpleGrid>
        )}
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <PlaceholderCard title="智能体" note="M2 接入" />
        <PlaceholderCard title="授权规则" note="M2 接入" />
        <PlaceholderCard title="用量" note="M4 接入" />
      </SimpleGrid>
    </Stack>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </div>
  )
}

function PlaceholderCard({ title, note }: { title: string; note: string }) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Text size="xs" c="dimmed">
        {note}
      </Text>
      <Text fw={600} mt={4}>
        {title}
      </Text>
      <Text size="sm" c="dimmed" mt="xs">
        —
      </Text>
    </Card>
  )
}
