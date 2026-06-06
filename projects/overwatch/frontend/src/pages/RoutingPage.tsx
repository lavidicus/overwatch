import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  TextField,
  Switch,
  Chip,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Add, Delete, Science, Edit } from '@mui/icons-material';
import { RoutingRule, SimulationResult, listRules, createRule, updateRule, deleteRule, simulate } from '../api/routing';

interface RuleDraft {
  id?: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  targetProviderId?: string;
  condition?: string; // JSON text
}

const emptyDraft: RuleDraft = { name: '', enabled: true, priority: 0 };

export default function RoutingPage() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [simulatePrompt, setSimulatePrompt] = useState('');
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  const load = async () => {
    try {
      const r = await listRules();
      setRules(r.rules);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, []);

  const openCreate = () => setDraft({ ...emptyDraft });
  const openEdit = (r: RoutingRule) => setDraft({
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    enabled: r.enabled,
    priority: r.priority,
    targetProviderId: r.targetProviderId ?? '',
    condition: r.condition ? JSON.stringify(r.condition, null, 2) : '',
  });

  const saveDraft = async () => {
    if (!draft) return;
    try {
      let condition: Record<string, unknown> | undefined;
      if (draft.condition && draft.condition.trim()) {
        condition = JSON.parse(draft.condition);
      }
      const payload: Partial<RoutingRule> = {
        name: draft.name,
        description: draft.description,
        enabled: draft.enabled,
        priority: draft.priority,
        targetProviderId: draft.targetProviderId || undefined,
        condition: condition ?? null,
      };
      if (draft.id) {
        await updateRule(draft.id, payload);
      } else {
        await createRule(payload);
      }
      setDraft(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await deleteRule(id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const runSimulate = async () => {
    if (!simulatePrompt.trim()) return;
    setSimulating(true);
    try {
      const r = await simulate(simulatePrompt);
      setSimResult(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h5" fontWeight={700} flex={1}>Routing Rules</Typography>
        <Button startIcon={<Add />} variant="contained" onClick={openCreate}>New Rule</Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Priority</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Target Provider</TableCell>
            <TableCell>Condition</TableCell>
            <TableCell>Enabled</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rules.length === 0 && (
            <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" sx={{ py: 4 }}>No routing rules defined.</Typography></TableCell></TableRow>
          )}
          {rules.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.priority}</TableCell>
              <TableCell>
                <Typography fontWeight={600}>{r.name}</Typography>
                {r.description && <Typography variant="caption" color="text.secondary">{r.description}</Typography>}
              </TableCell>
              <TableCell><code>{r.targetProviderId?.slice(0, 8) ?? '—'}</code></TableCell>
              <TableCell><code style={{ fontSize: 11 }}>{r.condition ? JSON.stringify(r.condition) : 'always'}</code></TableCell>
              <TableCell><Chip size="small" label={r.enabled ? 'enabled' : 'disabled'} color={r.enabled ? 'success' : 'default'} /></TableCell>
              <TableCell align="right">
                <Button size="small" startIcon={<Edit />} onClick={() => openEdit(r)}>Edit</Button>
                <Button size="small" color="error" startIcon={<Delete />} onClick={() => handleDelete(r.id)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Divider sx={{ my: 3 }} />

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Science fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
            Simulator
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Test prompt"
              multiline
              minRows={2}
              fullWidth
              value={simulatePrompt}
              onChange={(e) => setSimulatePrompt(e.target.value)}
            />
            <Button variant="outlined" disabled={simulating || !simulatePrompt.trim()} onClick={runSimulate}>
              {simulating ? 'Simulating…' : 'Run simulation'}
            </Button>
            {simResult && (
              <Box>
                <Typography variant="subtitle2">Selected rule:</Typography>
                {simResult.decision ? (
                  <Alert severity="success">
                    <strong>{simResult.decision.ruleName}</strong> → provider <code>{simResult.decision.providerId}</code> ({simResult.decision.reason})
                  </Alert>
                ) : (
                  <Alert severity="info">No rule matched. Falling back to session default.</Alert>
                )}
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Evaluation trace:</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Rule</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Matched</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {simResult.trace.map((t) => (
                      <TableRow key={t.ruleId}>
                        <TableCell>{t.ruleName}</TableCell>
                        <TableCell><code>{t.reason}</code></TableCell>
                        <TableCell>{t.matched ? '✅' : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!draft} onClose={() => setDraft(null)} maxWidth="md" fullWidth>
        <DialogTitle>{draft?.id ? 'Edit Rule' : 'New Rule'}</DialogTitle>
        <DialogContent>
          {draft && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} fullWidth />
              <TextField label="Description" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} fullWidth />
              <TextField label="Priority" type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} />
              <TextField label="Target Provider ID (UUID)" value={draft.targetProviderId ?? ''} onChange={(e) => setDraft({ ...draft, targetProviderId: e.target.value })} fullWidth />
              <TextField
                label="Condition (JSON, optional)"
                placeholder='{"maxTokens": 100, "contentPattern": "code|python"}'
                multiline minRows={4} value={draft.condition ?? ''}
                onChange={(e) => setDraft({ ...draft, condition: e.target.value })}
                fullWidth
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Switch checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
                <Typography>Enabled</Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDraft(null)}>Cancel</Button>
          <Button onClick={saveDraft} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
