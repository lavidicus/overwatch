import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, FormControl, FormLabel, RadioGroup,
  Radio, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Chip, Grid, useTheme, Alert, IconButton,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import { listBenchmarks, createBenchmark, deleteBenchmark } from '../api/benchmark';
import { getAuthToken } from '../utils/auth';

interface Provider { id: string; name: string; type: string; model: string; }
interface Model { id: string; name: string; quantization?: string; }

export default function BenchmarkPage() {
  // theme available if needed later
  useTheme();
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [iterations, setIterations] = useState(3);
  const [type, setType] = useState<'SPEED' | 'QUALITY' | 'COMPARATIVE'>('SPEED');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [benchData, provData] = await Promise.all([
        listBenchmarks(1, 20),
        fetch('/api/providers', {
          headers: { Authorization: `Bearer ${getAuthToken() || ''}` },
        }).then(r => r.json()),
      ]);
      setBenchmarks(benchData.runs || []);
      setProviders(provData.providers || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvider = async (providerId: string) => {
    setSelectedProvider(providerId);
    try {
      const res = await fetch(`/api/providers/${providerId}/models`, {
        headers: { Authorization: `Bearer ${getAuthToken() || ''}` },
      });
      const data = await res.json();
      setModels(data.models || []);
      if (data.models.length > 0) setSelectedModel(data.models[0].id);
    } catch {
      setModels([]);
    }
  };

  const handleRunBenchmark = async () => {
    if (!selectedProvider || !selectedModel) {
      setError('Select a provider and model');
      return;
    }
    setRunning(true);
    setError(null);
    try {
      await createBenchmark({
        name: name || `Benchmark ${new Date().toLocaleTimeString()}`,
        providerId: selectedProvider,
        modelId: selectedModel,
        iterations,
        type,
      });
      setShowForm(false);
      setSelectedProvider('');
      setName('');
      setTimeout(loadData, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run benchmark');
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBenchmark(id);
      setBenchmarks(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, overflow: 'auto', height: '100vh', bgcolor: '#0a0a0f' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary">Benchmarks</Typography>
        <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => setShowForm(true)}>
          New Benchmark
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      {/* Stats Summary */}
      {benchmarks.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, bgcolor: '#0d1117' }}>
              <Typography color="text.secondary" variant="body2">Total Runs</Typography>
              <Typography variant="h4">{benchmarks.length}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, bgcolor: '#0d1117' }}>
              <Typography color="text.secondary" variant="body2">Completed</Typography>
              <Typography variant="h4" color="success.main">
                {benchmarks.filter(b => b.status === 'COMPLETED').length}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, bgcolor: '#0d1117' }}>
              <Typography color="text.secondary" variant="body2">Avg Speed</Typography>
              <Typography variant="h4" color="info.main">
                {benchmarks.filter(b => b.status === 'COMPLETED' && b.results?.avgTokensPerSec)?.[0]?.results?.avgTokensPerSec
                  ? `${benchmarks.filter(b => b.status === 'COMPLETED' && b.results?.avgTokensPerSec)?.[0]?.results?.avgTokensPerSec} tok/s`
                  : 'N/A'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Table */}
      <TableContainer component={Paper} sx={{ bgcolor: '#0d1117' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Model</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Avg Latency</TableCell>
              <TableCell>Avg Speed</TableCell>
              <TableCell>Results</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {benchmarks.map(b => (
              <TableRow key={b.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell>{b.name}</TableCell>
                <TableCell><Chip label={b.benchmarkType} size="small" /></TableCell>
                <TableCell>{b.providerId}</TableCell>
                <TableCell>{b.modelId}</TableCell>
                <TableCell>
                  <Chip
                    label={b.status}
                    size="small"
                    color={b.status === 'COMPLETED' ? 'success' : b.status === 'RUNNING' ? 'info' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  {b.results?.avgLatencyMs ? `${b.results.avgLatencyMs}ms` : '—'}
                </TableCell>
                <TableCell>
                  {b.results?.avgTokensPerSec ? `${b.results.avgTokensPerSec} tok/s` : '—'}
                </TableCell>
                <TableCell>
                  {b.results?.totalRuns != null ? `${b.results.completedRuns}/${b.results.totalRuns}` : '—'}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleDelete(b.id)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {benchmarks.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No benchmarks yet. Click "New Benchmark" to start.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Benchmark Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Benchmark</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth label="Name" value={name} onChange={e => setName(e.target.value)}
              placeholder="My speed test" />

            <FormControl fullWidth>
              <FormLabel>Provider</FormLabel>
              <RadioGroup value={selectedProvider} onChange={e => handleSelectProvider(e.target.value)}>
                {providers.map(p => (
                  <FormControlLabel key={p.id} value={p.id} control={<Radio />}
                    label={`${p.name} (${p.type})`} />
                ))}
              </RadioGroup>
            </FormControl>

            {selectedProvider && models.length > 0 && (
              <FormControl fullWidth>
                <FormLabel>Model</FormLabel>
                <RadioGroup value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                  {models.map(m => (
                    <FormControlLabel key={m.id} value={m.id} control={<Radio />}
                      label={m.name} />
                  ))}
                </RadioGroup>
              </FormControl>
            )}

            <FormControl fullWidth>
              <FormLabel>Iterations</FormLabel>
              <TextField type="number" value={iterations} onChange={e => setIterations(parseInt(e.target.value) || 1)}
                inputProps={{ min: 1, max: 20 }} sx={{ mt: 1 }} />
            </FormControl>

            <FormControl fullWidth>
              <FormLabel>Type</FormLabel>
              <RadioGroup value={type} onChange={e => setType(e.target.value as any)}>
                <FormControlLabel value="SPEED" control={<Radio />} label="Speed (measure tokens/sec)" />
                <FormControlLabel value="QUALITY" control={<Radio />} label="Quality (store responses for eval)" />
                <FormControlLabel value="COMPARATIVE" control={<Radio />} label="Comparative (both)" />
              </RadioGroup>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={handleRunBenchmark} variant="contained" disabled={running || !selectedProvider || !selectedModel}>
            {running ? <CircularProgress size={24} /> : 'Run Benchmark'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
