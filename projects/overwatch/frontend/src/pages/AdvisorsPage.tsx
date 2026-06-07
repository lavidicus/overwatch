import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Alert,
  CircularProgress,
  MenuItem,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import { Edit, Delete, Add, Construction, RocketLaunch } from '@mui/icons-material';
import { AdvisorProfile, listAdvisors, createAdvisor, updateAdvisor, deleteAdvisor, listProviders, listProviderModels, Provider, ProviderModel, generateAdvisor } from '../api/advisors';

export default function AdvisorsPage() {
  const [advisors, setAdvisors] = useState<AdvisorProfile[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<AdvisorProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    systemPrompt: '',
    providerId: '',
    model: '',
  });

  // AI generation state
  const [genInstruction, setGenInstruction] = useState('');
  const [genProviderId, setGenProviderId] = useState('');
  const [genModel, setGenModel] = useState('');
  const [genProviderModels, setGenProviderModels] = useState<ProviderModel[]>([]);
  const [genModelLoading, setGenModelLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Manual form model loading
  const [formProviderModels, setFormProviderModels] = useState<ProviderModel[]>([]);
  const [formModelLoading, setFormModelLoading] = useState(false);

  // When genProvider changes, load its models
  useEffect(() => {
    if (!genProviderId) {
      setGenProviderModels([]);
      setGenModel('');
      return;
    }
    setGenModelLoading(true);
    listProviderModels(genProviderId)
      .then(r => {
        const available = r.models.filter(m => m.status === 'AVAILABLE');
        setGenProviderModels(available);
        // Auto-select first available
        if (available.length > 0) {
          setGenModel(available[0].name);
        }
      })
      .catch(() => { setGenProviderModels([]); setGenModel(''); })
      .finally(() => setGenModelLoading(false));
  }, [genProviderId]);

  // When form provider changes, load its models
  useEffect(() => {
    if (!formData.providerId) {
      setFormProviderModels([]);
      return;
    }
    setFormModelLoading(true);
    listProviderModels(formData.providerId)
      .then(r => {
        const available = r.models.filter(m => m.status === 'AVAILABLE');
        setFormProviderModels(available);
      })
      .catch(() => setFormProviderModels([]))
      .finally(() => setFormModelLoading(false));
  }, [formData.providerId]);

  const loadData = async () => {
    try {
      const [advisorsRes, providersRes] = await Promise.all([listAdvisors(), listProviders()]);
      setAdvisors(advisorsRes.advisors);
      setProviders(providersRes.providers);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDialog = (advisor?: AdvisorProfile) => {
    if (advisor) {
      setEditingAdvisor(advisor);
      setFormData({
        name: advisor.name,
        systemPrompt: advisor.systemPrompt,
        providerId: advisor.providerId || '',
        model: advisor.model || '',
      });
    } else {
      setEditingAdvisor(null);
      setFormData({
        name: '',
        systemPrompt: '',
        providerId: '',
        model: '',
      });
    }
    setGenInstruction('');
    setGenProviderId('');
    setGenModel('');
    setGenProviderModels([]);
    setGenResult(null);
    setGenError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAdvisor(null);
  };

  const handleSave = async () => {
    try {
      const input = {
        name: formData.name,
        systemPrompt: formData.systemPrompt,
        providerId: formData.providerId || null,
        model: formData.model || null,
      };

      if (editingAdvisor) {
        await updateAdvisor(editingAdvisor.id, input);
      } else {
        await createAdvisor(input);
      }
      await loadData();
      handleCloseDialog();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advisor?')) return;
    setDeletingId(id);
    try {
      await deleteAdvisor(id);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerate = async () => {
    if (!genInstruction.trim()) {
      setGenError('Please describe what kind of advisor you want to create.');
      return;
    }
    setGenerating(true);
    setGenError(null);
    setGenResult(null);
    try {
      const result = await generateAdvisor({
        instruction: genInstruction,
        providerId: genProviderId || undefined,
        model: genModel || undefined,
      });
      setGenResult(result.generatedPrompt);
    } catch (e: any) {
      setGenError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptPrompt = () => {
    if (genResult) {
      setFormData(prev => ({ ...prev, systemPrompt: genResult }));
      setGenResult(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Advisors
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Create New Advisor
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>System Prompt</TableCell>
            <TableCell>Provider</TableCell>
            <TableCell>Model</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {advisors.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Typography color="text.secondary" sx={{ py: 4 }}>
                  No advisors yet. Create one to get started.
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {advisors.map((advisor) => (
            <TableRow key={advisor.id}>
              <TableCell>{advisor.name}</TableCell>
              <TableCell>
                <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>
                  {advisor.systemPrompt.substring(0, 100)}
                  {advisor.systemPrompt.length > 100 && '...'}
                </Typography>
              </TableCell>
              <TableCell>
                {advisor.provider ? (
                  <Chip label={advisor.provider.name} size="small" />
                ) : (
                  <Typography variant="body2" color="text.secondary">—</Typography>
                )}
              </TableCell>
              <TableCell>
                {advisor.model ? (
                  <Chip label={advisor.model} size="small" variant="outlined" />
                ) : (
                  <Typography variant="body2" color="text.secondary">—</Typography>
                )}
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => handleOpenDialog(advisor)}>
                  <Edit />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(advisor.id)}
                  disabled={deletingId === advisor.id}
                >
                  {deletingId === advisor.id ? <CircularProgress size={20} /> : <Delete />}
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingAdvisor ? 'Edit Advisor' : 'Create New Advisor'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {/* --- AI Assistance Section --- */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Construction fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight={600}>AI-Assisted Profile Generation</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Describe what your advisor should do and pick a model to generate the system prompt.
            </Typography>
            <TextField
              label="Describe your advisor"
              value={genInstruction}
              onChange={(e) => setGenInstruction(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="e.g., Create a security review advisor that specializes in AWS cloud infrastructure, checks for CIS benchmarks, and recommends remediations."
              sx={{ mb: 1 }}
            />
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField
                label="Provider"
                select
                value={genProviderId}
                onChange={(e) => setGenProviderId(e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value=""><em>Auto-select</em></MenuItem>
                {providers.map((provider) => (
                  <MenuItem key={provider.id} value={provider.id}>
                    {provider.name} ({provider.type})
                  </MenuItem>
                ))}
              </TextField>
              {genProviderModels.length > 0 && genProviderId && (
                <TextField
                  label="Model"
                  select
                  value={genModel}
                  onChange={(e) => setGenModel(e.target.value)}
                  fullWidth
                  size="small"
                  SelectProps={{ displayEmpty: true }}
                >
                  {genModelLoading && <MenuItem value="" disabled><CircularProgress size={16} sx={{ mr: 1 }} />Loading...</MenuItem>}
                  {genProviderModels.map((m) => (
                    <MenuItem key={m.id} value={m.name}>
                      {m.displayName || m.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
            {genProviderId && genProviderModels.length === 0 && !genModelLoading && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                No available models for this provider.
              </Typography>
            )}
            {genError && <Typography color="error" variant="caption" sx={{ display: 'block', mb: 1 }}>{genError}</Typography>}
            <Button
              variant="outlined"
              startIcon={generating ? <CircularProgress size={16} /> : <RocketLaunch />}
              onClick={handleGenerate}
              disabled={generating || !genInstruction.trim()}
              fullWidth
            >
              {generating ? 'Generating...' : 'Generate Advisor Profile'}
            </Button>
          </Paper>

          {/* Generated Result */}
          {genResult && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'success.lighter' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2" color="success.dark">
                  ✅ Generated successfully (used {genProviderId ? providers.find(p => p.id === genProviderId)?.name : 'auto'} model)
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" onClick={() => setGenResult(null)}>Discard</Button>
                  <Button size="small" variant="contained" onClick={handleAcceptPrompt}>Use This Prompt</Button>
                </Stack>
              </Stack>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={genResult}
                InputProps={{ readOnly: true }}
                sx={{ mt: 1 }}
              />
            </Paper>
          )}

          {/* --- Manual Form --- */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              placeholder="e.g., Code Reviewer, Security Analyst, DevOps Assistant"
            />
            <TextField
              label="System Prompt"
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              fullWidth
              multiline
              rows={12}
              required
              placeholder="You are a helpful assistant specialized in..."
            />
            <TextField
              label="Provider"
              select
              value={formData.providerId}
              onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
              fullWidth
              SelectProps={{
                displayEmpty: true,
              }}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {providers.map((provider) => (
                <MenuItem key={provider.id} value={provider.id}>
                  {provider.name} ({provider.type})
                </MenuItem>
              ))}
            </TextField>
            {formData.providerId && (
              <TextField
                label="Model"
                select
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                fullWidth
                SelectProps={{
                  displayEmpty: true,
                }}
              >
                {formModelLoading && <MenuItem value="" disabled><CircularProgress size={16} sx={{ mr: 1 }} />Loading...</MenuItem>}
                <MenuItem value=""><em>None</em></MenuItem>
                {formProviderModels.map((m) => (
                  <MenuItem key={m.id} value={m.name}>
                    {m.displayName || m.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.name || !formData.systemPrompt}
          >
            {editingAdvisor ? 'Save Changes' : 'Create Advisor'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
