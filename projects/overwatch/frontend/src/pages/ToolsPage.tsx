import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  Chip,
  Stack,
  Alert,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Cancel, PlayArrow, HourglassEmpty } from '@mui/icons-material';
import { Tool, ToolInvocation, listTools, patchTool, listInvocations, approveInvocation, rejectInvocation, executeInvocation } from '../api/tools';

export default function ToolsPage() {
  const [tab, setTab] = useState(0);
  const [tools, setTools] = useState<Tool[]>([]);
  const [invocations, setInvocations] = useState<ToolInvocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTools = async () => {
    try {
      const r = await listTools();
      setTools(r.tools);
    } catch (e: any) {
      setError(e.message);
    }
  };
  const loadInvocations = async () => {
    try {
      const r = await listInvocations();
      setInvocations(r.invocations);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadTools(), loadInvocations()]);
      setLoading(false);
    })();
  }, []);

  const toggleEnabled = async (tool: Tool) => {
    try {
      await patchTool(tool.id, { enabled: !tool.enabled });
      await loadTools();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleApprove = async (id: string) => {
    await approveInvocation(id);
    await loadInvocations();
  };
  const handleReject = async (id: string) => {
    await rejectInvocation(id);
    await loadInvocations();
  };
  const handleExecute = async (id: string) => {
    await executeInvocation(id);
    await loadInvocations();
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  const grouped = tools.reduce<Record<string, Tool[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  const pendingInvocations = invocations.filter((i) => i.status === 'PENDING');

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Tools & Agent Invocations</Typography>
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Catalog (${tools.length})`} />
        <Tab label={`Pending Approval (${pendingInvocations.length})`} />
        <Tab label={`Recent Invocations (${invocations.length})`} />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={2}>
          {Object.entries(grouped).map(([category, group]) => (
            <Box key={category}>
              <Typography variant="overline" color="text.secondary">{category}</Typography>
              <Stack spacing={1}>
                {group.map((tool) => (
                  <Card key={tool.id} variant="outlined">
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box flex={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1" fontWeight={600}>{tool.name}</Typography>
                          {tool.requiresApproval && <Chip size="small" label="Requires Approval" color="warning" />}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">{tool.description}</Typography>
                      </Box>
                      <Switch checked={tool.enabled} onChange={() => toggleEnabled(tool)} />
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {tab === 1 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tool</TableCell>
              <TableCell>Args</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingInvocations.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center"><Typography color="text.secondary" sx={{ py: 4 }}>No pending invocations.</Typography></TableCell></TableRow>
            )}
            {pendingInvocations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.tool?.name ?? inv.toolId}</TableCell>
                <TableCell><pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(inv.args, null, 0)}</pre></TableCell>
                <TableCell>{new Date(inv.createdAt).toLocaleString()}</TableCell>
                <TableCell align="right">
                  <Button size="small" startIcon={<CheckCircle />} onClick={() => handleApprove(inv.id)}>Approve</Button>
                  <Button size="small" color="error" startIcon={<Cancel />} onClick={() => handleReject(inv.id)}>Reject</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {tab === 2 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tool</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invocations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.tool?.name ?? inv.toolId}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    icon={statusIcon(inv.status)}
                    label={inv.status}
                    color={statusColor(inv.status)}
                  />
                </TableCell>
                <TableCell>{inv.durationMs ? `${inv.durationMs}ms` : '—'}</TableCell>
                <TableCell>{new Date(inv.createdAt).toLocaleString()}</TableCell>
                <TableCell align="right">
                  {inv.status === 'APPROVED' && (
                    <Button size="small" startIcon={<PlayArrow />} onClick={() => handleExecute(inv.id)}>Execute</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

function statusIcon(status: string) {
  switch (status) {
    case 'DONE': return <CheckCircle />;
    case 'FAILED': case 'REJECTED': return <Cancel />;
    case 'RUNNING': return <PlayArrow />;
    default: return <HourglassEmpty />;
  }
}

function statusColor(status: string): 'default' | 'success' | 'error' | 'warning' | 'info' {
  switch (status) {
    case 'DONE': return 'success';
    case 'FAILED': case 'REJECTED': return 'error';
    case 'PENDING': return 'warning';
    case 'RUNNING': return 'info';
    default: return 'default';
  }
}
