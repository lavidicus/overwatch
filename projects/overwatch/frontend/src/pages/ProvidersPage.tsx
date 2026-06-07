import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ConnectedIcon,
  Error as ErrorIcon,
  Sync as SyncIcon,
  LinkOff as DisconnectIcon,
  Dns as ProviderIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { providersApi } from '../services/api';

interface Provider {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  port?: number;
  model: string;
  status: string;
  lastChecked?: string;
  latencyMs?: number;
  createdAt: string;
}

const PROVIDER_TYPES = [
  { value: 'VLLM', label: 'vLLM' },
  { value: 'OLLAMA', label: 'Ollama' },
  { value: 'LLAMACPP', label: 'llama.cpp' },
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'ANTHROPIC', label: 'Anthropic' },
  { value: 'OPENCLAW', label: 'OpenClaw' },
  { value: 'HERMES', label: 'Hermes' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [discovering, setDiscovering] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'VLLM',
    baseUrl: '',
    port: '',
    apiKey: '',
    model: '',
    piEngine: false,
  });

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await providersApi.list();
      setProviders(response.data.providers || []);
    } catch (error) {
      console.error('Failed to load providers:', error);
      setAlert({ type: 'error', message: 'Failed to load providers' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (provider?: Provider) => {
    if (provider) {
      setEditingProvider(provider);
      setFormData({
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        port: provider.port?.toString() || '',
        apiKey: '',
        model: provider.model,
        piEngine: (provider as any).config?.engine === 'pi' || false,
      });
    } else {
      setEditingProvider(null);
      setFormData({
        name: '',
        type: 'VLLM',
        baseUrl: '',
        port: '',
        apiKey: '',
        model: '',
        piEngine: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProvider(null);
    setFormData({
      name: '',
      type: 'VLLM',
      baseUrl: '',
      port: '',
      apiKey: '',
      model: '',
      piEngine: false,
    });
  };

  const handleSubmit = async () => {
    try {
      const data: any = {
        ...formData,
        port: formData.port ? parseInt(formData.port) : undefined,
        config: formData.piEngine ? { engine: 'pi' } : {},
      };

      if (editingProvider) {
        await providersApi.update(editingProvider.id, data);
        setAlert({ type: 'success', message: 'Provider updated successfully' });
      } else {
        await providersApi.create(data);
        setAlert({ type: 'success', message: 'Provider created successfully. Connect to auto-detect models.' });
      }

      handleCloseDialog();
      loadProviders();
    } catch (error: any) {
      console.error('Failed to save provider:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Failed to save provider',
      });
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      setTestingId(id);
      const response = await providersApi.connect(id, { testConnection: true });
      
      setAlert({
        type: response.data.success ? 'success' : 'error',
        message: response.data.message,
      });

      if (response.data.models && response.data.models.length > 0) {
        setAlert({
          type: 'success',
          message: `${response.data.message} - Found ${response.data.models.length} models`,
        });
      }

      loadProviders();
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Connection test failed',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await providersApi.disconnect(id);
      setAlert({ type: 'success', message: 'Provider disconnected' });
      loadProviders();
    } catch (error: any) {
      console.error('Disconnect failed:', error);
      setAlert({ type: 'error', message: 'Failed to disconnect provider' });
    }
  };

  const handleDiscoverAllModels = async (providerId: string) => {
    try {
      setAlert({ type: 'success', message: 'Discovering and registering all models...' });
      const response = await providersApi.discoverAll(providerId);
      setAlert({
        type: 'success',
        message: response.data.message || 'Models discovered and registered',
      });
      loadProviders();
    } catch (error: any) {
      console.error('Discover all failed:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Failed to discover and register models',
      });
    }
  };

  // Create provider and auto-discover models in one step
  const handleCreateAndDiscover = async () => {
    try {
      setDiscovering(true);
      const data = {
        ...formData,
        port: formData.port ? parseInt(formData.port) : undefined,
      };

      // Step 1: Create the provider
      const createResponse = await providersApi.create(data);
      const providerId = createResponse.data.provider.id;
      setAlert({ type: 'success', message: 'Provider created. Discovering models...' });

      // Step 2: Test connection (which also fetches models)
      await providersApi.connect(providerId, { testConnection: true });

      // Step 3: Auto-register discovered models
      await providersApi.discoverAll(providerId);

      setAlert({ type: 'success', message: 'Provider created and models auto-detected!' });
      handleCloseDialog();
      loadProviders();
    } catch (error: any) {
      console.error('Create and discover failed:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Failed to create provider and discover models',
      });
    } finally {
      setDiscovering(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;

    try {
      await providersApi.delete(id);
      setAlert({ type: 'success', message: 'Provider deleted successfully' });
      loadProviders();
    } catch (error: any) {
      console.error('Delete failed:', error);
      setAlert({ type: 'error', message: 'Failed to delete provider' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <ConnectedIcon color="success" />;
      case 'ERROR':
        return <ErrorIcon color="error" />;
      case 'TESTING':
        return <CircularProgress size={20} />;
      default:
        return <DisconnectIcon color="action" />;
    }
  };

  // Build preview URL from host + port
  const previewUrl = () => {
    let host = formData.baseUrl.trim();
    const port = formData.port.trim();
    
    if (!host) return '';
    
    // Remove trailing slashes
    host = host.replace(/\/+$/, '');
    
    // Add http if no protocol
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
      host = 'http://' + host;
    }
    
    const url = new URL(host);
    
    // Add port if specified and not default
    if (port) {
      url.port = port;
    }
    
    return url.toString();
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ProviderIcon fontSize="large" color="primary" />
          <Typography variant="h4" fontWeight={700}>
            Providers
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Provider
        </Button>
      </Box>

      {/* Alert */}
      {alert && (
        <Alert
          severity={alert.type}
          onClose={() => setAlert(null)}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Providers Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : providers.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ProviderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No providers configured
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add your first LLM or agent provider to get started
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {providers.map((provider) => (
            <Grid item xs={12} sm={6} md={4} key={provider.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {provider.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {PROVIDER_TYPES.find((t) => t.value === provider.type)?.label || provider.type}
                      </Typography>
                    </Box>
                    {getStatusIcon(provider.status)}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2">
                      <strong>URL:</strong> {provider.baseUrl}
                      {provider.port && `:${provider.port}`}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Default Model:</strong> {provider.model}
                    </Typography>
                    {provider.latencyMs && (
                      <Typography variant="body2">
                        <strong>Latency:</strong> {provider.latencyMs}ms
                      </Typography>
                    )}
                    {provider.lastChecked && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Last Checked:</strong>{' '}
                        {new Date(provider.lastChecked).toLocaleString()}
                      </Typography>
                    )}
                  </Box>

                  {provider.status === 'CONNECTED' && (
                    <Chip
                      label="Connected"
                      color="success"
                      size="small"
                      sx={{ mt: 2 }}
                    />
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'flex-end', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleTestConnection(provider.id)}
                    disabled={testingId === provider.id}
                  >
                    {testingId === provider.id ? <CircularProgress size={20} /> : <SyncIcon />}
                  </IconButton>
                  {provider.status === 'CONNECTED' && (
                    <Button
                      size="small"
                      startIcon={<AutoAwesomeIcon />}
                      onClick={() => handleDiscoverAllModels(provider.id)}
                      variant="outlined"
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      Discover All
                    </Button>
                  )}
                  <IconButton size="small" onClick={() => handleOpenDialog(provider)}>
                    <EditIcon />
                  </IconButton>
                  {provider.status === 'CONNECTED' && (
                    <IconButton size="small" onClick={() => handleDisconnect(provider.id)}>
                      <DisconnectIcon />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => handleDelete(provider.id)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProvider ? 'Edit Provider' : 'Add Provider'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {/* Name + Type row */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                //
                required
                placeholder="My vLLM Server"
              />
              <TextField
                select
                label="Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                sx={{ minWidth: 180 }}
                required
              >
                {PROVIDER_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* Host + Port row */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Host"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                //
                required
                placeholder="localhost or 192.168.1.100"
                helperText="Hostname or IP address only"
              />
              <TextField
                label="Port"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                sx={{ minWidth: 100 }}
                type="number"
                placeholder="11434"
                helperText="Leave blank for default"
              />
            </Box>

            {/* Preview URL */}
            {previewUrl() && (
              <TextField
                label="Full URL (auto-preview)"
                value={previewUrl()}
                //
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Box component="span" sx={{ fontSize: 12, color: 'text.disabled' }}>
                        auto
                      </Box>
                    </InputAdornment>
                  ),
                  sx: { bgcolor: 'action.disabledBackground', fontFamily: 'monospace' },
                }}
              />
            )}

            {/* API Key */}
            <TextField
              label="API Key (optional)"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              //
              type="password"
              placeholder="sk-... (only if the provider requires auth)"
              helperText="Skip for local servers (vLLM, Ollama, llama.cpp)"
            />

            {/* Default Model */}
            <TextField
              label="Default Model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              //
              required
              placeholder="Qwen3.6-35B"
              helperText="The main model for this provider. Add more via Auto-Detect"
            />
            
            {/* Pi Engine Toggle */}
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.piEngine}
                    onChange={(e) => setFormData({ ...formData, piEngine: e.target.checked })}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesomeIcon fontSize="small" color="primary" />
                    <Typography variant="body2">Use Pi AI engine (access 60+ providers)</Typography>
                  </Box>
                }
                //
              />
              {formData.piEngine && (
                <Alert severity="info" sx={{ mt: 1, fontSize: '0.75rem' }} icon={false}>
                  <Typography variant="caption">
                    When enabled, use catalog models like openai/gpt-4o-mini, anthropic/claude-opus-4-6. Pi handles execution while keeping your provider config.
                  </Typography>
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {editingProvider ? (
            <>
              <Button
                onClick={() => handleTestConnection(editingProvider.id)}
                startIcon={<SyncIcon />}
                variant="outlined"
                disabled={testingId === editingProvider.id}
              >
                {testingId === editingProvider.id ? 'Testing...' : 'Test Connection'}
              </Button>
              {editingProvider.status === 'CONNECTED' && (
                <Button
                  onClick={() => handleDiscoverAllModels(editingProvider.id)}
                  startIcon={<AutoAwesomeIcon />}
                  variant="outlined"
                >
                  Auto-Detect Models
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={!formData.name || !formData.baseUrl}
              >
                Update
              </Button>
            </>
          ) : (
            <Button
              onClick={handleCreateAndDiscover}
              variant="contained"
              disabled={!formData.name || !formData.baseUrl}
              startIcon={discovering ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
            >
              {discovering ? 'Creating & Discovering...' : 'Create & Auto-Detect Models'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
