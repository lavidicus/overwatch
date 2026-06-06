import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Insights as InsightsIcon,
  CheckCircle,
  Cancel,
  PlayArrow,
} from '@mui/icons-material';
import {
  ChangeProposal,
  ChangeStatus,
  HealthOverview,
  listProposals,
  approveProposal,
  rejectProposal,
  runAnalysis,
  getHealth,
} from '../api/improvement';

const STATUSES: ChangeStatus[] = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'DEPLOYED', 'REJECTED', 'ROLLED_BACK'];

function priorityColor(p: string): 'default' | 'info' | 'warning' | 'error' {
  switch (p) {
    case 'CRITICAL': return 'error';
    case 'HIGH': return 'warning';
    case 'MEDIUM': return 'info';
    default: return 'default';
  }
}

function statusColor(s: string): 'default' | 'success' | 'warning' | 'info' | 'error' {
  switch (s) {
    case 'APPROVED': case 'DEPLOYED': return 'success';
    case 'REJECTED': case 'ROLLED_BACK': return 'error';
    case 'UNDER_REVIEW': return 'warning';
    case 'DRAFT': return 'info';
    default: return 'default';
  }
}

export default function ImprovementPage() {
  const [tab, setTab] = useState(0);
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [health, setHealth] = useState<HealthOverview | null>(null);
  const [filterStatus, setFilterStatus] = useState<ChangeStatus | ''>('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; reason: string } | null>(null);
  const [lastReport, setLastReport] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, h] = await Promise.all([
        listProposals({ status: filterStatus || undefined }),
        getHealth(),
      ]);
      setProposals(p.proposals);
      setHealth(h);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const r = await runAnalysis();
      setLastReport(
        `Issues found: ${r.providerIssues + r.benchmarkIssues + r.configIssues} ` +
        `(providers: ${r.providerIssues}, benchmarks: ${r.benchmarkIssues}, config: ${r.configIssues}). ` +
        `Proposals created: ${r.recommendationsCreated}, deduped: ${r.recommendationsSkipped}.`
      );
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveProposal(id);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    try {
      await rejectProposal(rejectDialog.id, rejectDialog.reason || undefined);
      setRejectDialog(null);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Self-Improvement</Typography>
        <Button
          variant="contained"
          startIcon={analyzing ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
          onClick={handleAnalyze}
          disabled={analyzing}
        >
          Run Analysis
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {lastReport && <Alert severity="info" onClose={() => setLastReport(null)} sx={{ mb: 2 }}>{lastReport}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Dashboard" />
        <Tab label="Change Proposals" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <InsightsIcon color="primary" />
                  <Typography variant="h6">System Health</Typography>
                </Stack>
                {health ? (
                  <>
                    <Typography sx={{ mt: 1 }}>
                      Providers online: <strong>{health.providers.online}/{health.providers.total}</strong>
                    </Typography>
                    <Typography>
                      Open proposals: <strong>{health.openProposals}</strong>
                    </Typography>
                    <Typography>
                      Benchmarks (7d): <strong>{health.benchmarksLast7d}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Generated {new Date(health.generatedAt).toLocaleString()}
                    </Typography>
                  </>
                ) : (
                  <CircularProgress size={20} />
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6">Providers</Typography>
                <Divider sx={{ my: 1 }} />
                {(health?.providers.items ?? []).map((p) => (
                  <Stack key={p.id} direction="row" spacing={2} alignItems="center" sx={{ py: 0.5 }}>
                    <Chip size="small" color={p.status === 'CONNECTED' ? 'success' : 'error'} label={p.status} />
                    <Typography sx={{ flex: 1 }}>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.latencyMs ? `${p.latencyMs}ms` : '—'}
                    </Typography>
                  </Stack>
                ))}
                {(health?.providers.items.length ?? 0) === 0 && (
                  <Typography variant="body2" color="text.secondary">No providers configured.</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 1 && (
        <Box>
          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
            <Chip
              label={`All (${proposals.length})`}
              color={filterStatus === '' ? 'primary' : 'default'}
              onClick={() => setFilterStatus('')}
            />
            {STATUSES.map((s) => (
              <Chip
                key={s}
                label={s}
                color={filterStatus === s ? 'primary' : 'default'}
                onClick={() => setFilterStatus(s)}
              />
            ))}
          </Stack>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
          ) : proposals.length === 0 ? (
            <Alert severity="info">No proposals match the current filter. Click "Run Analysis" to generate some.</Alert>
          ) : (
            <Stack spacing={1}>
              {proposals.map((p) => (
                <Card key={p.id}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1} flexWrap="wrap">
                      <Chip size="small" color={statusColor(p.status)} label={p.status} />
                      <Chip size="small" color={priorityColor(p.priority)} label={p.priority} />
                      <Chip size="small" variant="outlined" label={`risk ${p.risk}`} />
                      <Chip size="small" variant="outlined" label={p.category} />
                      {p.proposedBySystem && <Chip size="small" variant="outlined" label="auto" />}
                      <Typography variant="caption" color="text.secondary">
                        {new Date(p.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography variant="subtitle1" fontWeight="bold">{p.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{p.description}</Typography>
                    <Typography variant="caption" component="pre" sx={{
                      whiteSpace: 'pre-wrap',
                      bgcolor: 'action.hover',
                      p: 1,
                      borderRadius: 1,
                      mb: 1,
                    }}>
                      {JSON.stringify(p.configDiff, null, 2)}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        disabled={p.status === 'APPROVED' || p.status === 'DEPLOYED' || p.status === 'REJECTED'}
                        onClick={() => handleApprove(p.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Cancel />}
                        disabled={p.status === 'REJECTED' || p.status === 'DEPLOYED'}
                        onClick={() => setRejectDialog({ id: p.id, reason: '' })}
                      >
                        Reject
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      )}

      <Dialog open={rejectDialog !== null} onClose={() => setRejectDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Proposal</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Reason (optional)"
            value={rejectDialog?.reason ?? ''}
            onChange={(e) => setRejectDialog((prev) => prev ? { ...prev, reason: e.target.value } : prev)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReject}>Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
