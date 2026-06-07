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
  FormControl,
  InputLabel,
  Select,
  Breadcrumbs,
  Link,
  Step,
  StepLabel,
  Stepper,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ModelTraining as ModelIcon,
  FilterList as FilterIcon,
  FolderOpen as FolderOpenIcon,
  AutoAwesome as AutoAwesomeIcon,
  Computer as SystemIcon,
  Search as SearchIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { modelsApi, providersApi, systemsApi } from '../services/api';

interface Model {
  id: string;
  name: string;
  displayName?: string;
  quantization?: string;
  sizeGB?: number;
  parameters?: string;
  source?: string;
  downloadPath?: string;
  status: string;
  downloadProgress?: number;
  providerId: string;
  systemId?: string;
  visionModelId?: string;
  provider?: {
    id: string;
    name: string;
    type: string;
    status: string;
  };
  system?: {
    id: string;
    name: string;
    hostname: string;
  };
  visionModel?: {
    id: string;
    name: string;
    displayName?: string;
  };
  companionModels?: {
    id: string;
    name: string;
    displayName?: string;
  }[];
  createdAt: string;
}

interface Provider {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface System {
  id: string;
  name: string;
  hostname: string;
  protocol: string;
}

const MODEL_SOURCES = [
  { value: 'HUGGINGFACE', label: 'Hugging Face' },
  { value: 'LOCAL', label: 'Local (remote system)' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'DISCOVERED', label: 'Auto-Discovered' },
];

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  AVAILABLE: 'success',
  DOWNLOADING: 'warning',
  DOWNLOAD_FAILED: 'error',
};

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filesystem browser state
  const [fsBrowserOpen, setFsBrowserOpen] = useState(false);
  const [fsStep, setFsStep] = useState<'selectSystem' | 'browse' | 'inspect' | 'done'>('selectSystem');
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('/opt/models/gguf');
  const [fsEntries, setFsEntries] = useState<any[]>([]);
  const [loadingFs, setLoadingFs] = useState(false);
  const [ggufMetadata, setGgufMetadata] = useState<any>(null);

  // HuggingFace search state
  const [hfOpen, setHfOpen] = useState(false);
  const [hfQuery, setHfQuery] = useState('');
  const [hfResults, setHfResults] = useState<any[]>([]);
  const [hfLoading, setHfLoading] = useState(false);
  const [hfDownloading, setHfDownloading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    providerId: '',
    name: '',
    displayName: '',
    quantization: '',
    sizeGB: '',
    parameters: '',
    source: 'MANUAL',
    downloadPath: '',
    systemId: '',
    visionModelId: '',
    _autoVisionModelId: '',
  });

  useEffect(() => {
    loadModels();
    loadProviders();
    loadSystems();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await modelsApi.list();
      setModels(response.data.models || []);
    } catch (error) {
      console.error('Failed to load models:', error);
      setAlert({ type: 'error', message: 'Failed to load models' });
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await providersApi.list();
      setProviders(response.data.providers || []);
      if (!formData.providerId && response.data.providers?.length) {
        setFormData(prev => ({ ...prev, providerId: response.data.providers[0].id }));
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const loadSystems = async () => {
    try {
      const response = await systemsApi.list();
      setSystems(response.data.systems || []);
    } catch (error) {
      console.error('Failed to load systems:', error);
    }
  };

  const handleOpenDialog = (model?: Model) => {
    if (model) {
      setEditingModel(model);
      setFormData({
        providerId: model.providerId,
        name: model.name,
        displayName: model.displayName || '',
        quantization: model.quantization || '',
        sizeGB: model.sizeGB?.toString() || '',
        parameters: model.parameters || '',
        source: model.source || 'MANUAL',
        downloadPath: model.downloadPath || '',
        systemId: model.systemId || '',
        visionModelId: model.visionModelId || '',
        _autoVisionModelId: '',
      });
    } else {
      setEditingModel(null);
      setFormData({
        providerId: providers[0]?.id || '',
        name: '',
        displayName: '',
        quantization: '',
        sizeGB: '',
        parameters: '',
        source: 'MANUAL',
        downloadPath: '',
        systemId: '',
        visionModelId: '',
        _autoVisionModelId: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingModel(null);
  };

  const handleSubmit = async () => {
    try {
      // Strip internal fields and build clean payload
      const { _autoVisionModelId, ...cleanData } = formData as any;
      const data: any = {
        ...cleanData,
        sizeGB: cleanData.sizeGB ? parseFloat(cleanData.sizeGB) : undefined,
      };

      // Handle vision model auto-detection
      if (cleanData._autoVisionModelId && !cleanData.visionModelId) {
        data.visionModelId = cleanData._autoVisionModelId;
      }
      if (cleanData.visionModelId === '' || cleanData.visionModelId === null) {
        delete data.visionModelId;
      }

      if (editingModel) {
        await modelsApi.update(editingModel.id, data);
        setAlert({ type: 'success', message: 'Model updated successfully' });
      } else {
        await modelsApi.create(data);
        setAlert({ type: 'success', message: 'Model created successfully' });
      }

      handleCloseDialog();
      loadModels();
    } catch (error: any) {
      console.error('Failed to save model:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Failed to save model',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      await modelsApi.delete(id);
      setAlert({ type: 'success', message: 'Model deleted successfully' });
      loadModels();
    } catch (error: any) {
      console.error('Delete failed:', error);
      setAlert({ type: 'error', message: 'Failed to delete model' });
    }
  };

  // Filter models based on selected provider filter
  const filteredModels = models.filter((model) => {
    if (filterProvider === 'all') return true;
    return model.providerId === filterProvider;
  });

  const handleDiscoverAllModels = async (providerId: string) => {
    try {
      setAlert({ type: 'success', message: 'Discovering and registering all models...' });
      const response = await modelsApi.discoverAll(providerId);
      setAlert({
        type: 'success',
        message: response.data.message || 'Models discovered and registered',
      });
      loadModels();
    } catch (error: any) {
      console.error('Discover all failed:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Failed to discover and register models',
      });
    }
  };

  // ── Filesystem Browser Flow ──

  const startFsBrowser = () => {
    setSelectedSystemId('');
    setCurrentPath('/opt/models/gguf');
    setFsStep('selectSystem');
    setGgufMetadata(null);
    setFsBrowserOpen(true);
  };

  const loadFsTree = async (systemId: string, path: string) => {
    setLoadingFs(true);
    try {
      const response = await modelsApi.scanTree(systemId, path);
      setFsEntries(response.data.entries || []);
    } catch (error: any) {
      console.error('Failed to load filesystem tree:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Failed to browse filesystem',
      });
    } finally {
      setLoadingFs(false);
    }
  };

  const handleSystemSelected = (systemId: string) => {
    setSelectedSystemId(systemId);
    setCurrentPath('/opt/models/gguf');
    setFsStep('browse');
    loadFsTree(systemId, '/opt/models/gguf');
  };

  const handleNavigateDir = (path: string) => {
    setCurrentPath(path);
    loadFsTree(selectedSystemId, path);
  };

  const handleInspectGGUF = async (filePath: string) => {
    setFsStep('inspect');
    try {
      const response = await modelsApi.inspect(filePath, selectedSystemId);
      setGgufMetadata(response.data.metadata);
    } catch (error: any) {
      console.error('GGUF inspection failed:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Failed to inspect GGUF file',
      });
      setFsStep('browse');
    }
  };

  const handleRegisterFromInspection = async () => {
    if (!ggufMetadata) return;

    // Check if we already have a vision model registered on this provider
    let autoVisionModelId: string | null = null;
    if (ggufMetadata.isVisionModel || ggufMetadata.hasMmproj) {
      // Look for existing models that could be the base (non-vision) version
      for (const model of models) {
        if (model.providerId === (providers[0]?.id || '') &&
            !model.name.toLowerCase().includes('mmproj') &&
            model.name.toLowerCase().includes(ggufMetadata.name?.toLowerCase().split('-mmproj')[0]?.split('_mmproj')[0] || '')) {
          autoVisionModelId = model.id;
          break;
        }
      }
    }

    setFormData({
      providerId: providers[0]?.id || formData.providerId,
      name: ggufMetadata.name || formData.name,
      displayName: ggufMetadata.displayName || ggufMetadata.name || '',
      quantization: ggufMetadata.quantization || formData.quantization,
      sizeGB: (ggufMetadata.sizeGB ?? formData.sizeGB).toString(),
      parameters: ggufMetadata.parameterCount || formData.parameters,
      source: 'LOCAL',
      downloadPath: ggufMetadata.filePath || '',
      systemId: selectedSystemId,
      visionModelId: '',
      _autoVisionModelId: autoVisionModelId || '',
    });
    setFsBrowserOpen(false);
    setDialogOpen(true);
    setFsStep('selectSystem');
    let msg = 'Model metadata extracted';
    if (ggufMetadata.hasMmproj) {
      msg += ` — ${ggufMetadata.mmprojFiles?.length || '?'} companion mmproj file(s) detected`; // eslint-disable-line
    }
    if (ggufMetadata.isVisionModel) {
      msg += ' (vision model)';
    }
    setAlert({ type: 'success', message: msg + ' — save to register' });
  };

  // ── HuggingFace Search ──

  const searchHuggingFace = async () => {
    if (!hfQuery.trim()) return;
    setHfLoading(true);
    try {
      const response = await fetch(`https://huggingface.co/api/models?search=${encodeURIComponent(hfQuery)}&limit=20&sort=downloads&direction=-1`);
      const data = await response.json();
      setHfResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('HF search failed:', error);
      setAlert({ type: 'error', message: 'HuggingFace search failed' });
    } finally {
      setHfLoading(false);
    }
  };

  const downloadFromHF = async (modelId: string) => {
    setHfDownloading(modelId);
    try {
      // Create a HF download task via the API
      await fetch('/api/models/hf-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          repoId: modelId,
          systemId: selectedSystemId,
        }),
      });
      setAlert({ type: 'success', message: `Download started for ${modelId}` });
    } catch (error) {
      console.error('HF download failed:', error);
      setAlert({ type: 'error', message: 'Failed to queue download' });
    } finally {
      setHfDownloading(null);
    }
  };

  return (
    <Box sx={{
      height: 'calc(100vh - 64px)',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ModelIcon fontSize="large" color="primary" />
          <Typography variant="h4" fontWeight={700}>
            Models
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<SystemIcon />}
            onClick={startFsBrowser}
            disabled={systems.length === 0}
          >
            Discover from System
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            onClick={() => setHfOpen(true)}
          >
            Search HuggingFace
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={providers.length === 0}
          >
            Add Model
          </Button>
        </Box>
      </Box>

      {/* Alert */}
      {alert && (
        <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb: 3 }}>
          {alert.message}
        </Alert>
      )}

      {/* No providers warning */}
      {providers.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No providers configured. Add a provider first to register models.
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <FilterIcon color="action" />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Provider</InputLabel>
          <Select
            value={filterProvider}
            label="Provider"
            onChange={(e) => setFilterProvider(e.target.value)}
          >
            <MenuItem value="all">All Providers</MenuItem>
            {providers.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Models Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredModels.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ModelIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No models found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Get models several ways:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {systems.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<SystemIcon />}
                onClick={startFsBrowser}
              >
                Discover from System
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<CloudDownloadIcon />}
              onClick={() => setHfOpen(true)}
            >
              Search HuggingFace
            </Button>
            <Button
              variant="outlined"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => handleOpenDialog()}
              disabled={providers.length === 0}
            >
              Add Model Manually
            </Button>
          </Box>
          {providers.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Auto-discover models from connected providers:
              </Typography>
              {providers.map((p) => (
                <Button
                  key={p.id}
                  variant="outlined"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={() => handleDiscoverAllModels(p.id)}
                  disabled={p.status !== 'CONNECTED'}
                  sx={{ mr: 1, mb: 1 }}
                >
                  Discover {p.name}
                </Button>
              ))}
            </Box>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredModels.map((model) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={model.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" fontWeight={600} noWrap>
                      {model.displayName || model.name}
                    </Typography>
                    <Chip
                      label={model.status}
                      color={STATUS_COLORS[model.status] || 'default'}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {model.provider?.name || 'No provider'}
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {model.parameters && (
                      <Typography variant="body2">
                        <strong>Params:</strong> {model.parameters}
                      </Typography>
                    )}
                    {model.quantization && (
                      <Typography variant="body2">
                        <strong>Quant:</strong> {model.quantization}
                      </Typography>
                    )}
                    {model.sizeGB && (
                      <Typography variant="body2">
                        <strong>Size:</strong> {model.sizeGB} GB
                      </Typography>
                    )}
                    {model.source && (
                      <Typography variant="body2">
                        <strong>Source:</strong>{' '}
                        {MODEL_SOURCES.find((s) => s.value === model.source)?.label || model.source}
                      </Typography>
                    )}
                    {model.system && (
                      <Typography variant="body2">
                        <strong>System:</strong>{' '}{model.system.name} ({model.system.hostname})
                      </Typography>
                    )}
                    {model.visionModel && (
                      <Chip label={`Linked: ${model.visionModel.displayName || model.visionModel.name}`} size="small" color="info" sx={{ mt: 1 }} />
                    )}
                    {model.companionModels && model.companionModels.length > 0 && (
                      <Chip label={`${model.companionModels.length} companion(s)`} size="small" color="secondary" sx={{ mt: 1 }} />
                    )}
                    {model.downloadProgress !== undefined && model.status === 'DOWNLOADING' && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Downloading: {Math.round(model.downloadProgress)}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <IconButton size="small" onClick={() => handleOpenDialog(model)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(model.id)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Filesystem Browser Dialog ── */}
      <Dialog
        open={fsBrowserOpen}
        onClose={() => { setFsBrowserOpen(false); setFsStep('selectSystem'); }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Discover GGUF Models from Remote System
        </DialogTitle>
        <DialogContent>
          {/* Stepper */}
          <Stepper activeStep={
            fsStep === 'selectSystem' ? 0 :
            fsStep === 'browse' ? 1 :
            fsStep === 'inspect' ? 2 : 3
          } sx={{ mb: 3 }}>
            <Step><StepLabel>Select System</StepLabel></Step>
            <Step><StepLabel>Browse Files</StepLabel></Step>
            <Step><StepLabel>Inspect GGUF</StepLabel></Step>
            <Step><StepLabel>Register Model</StepLabel></Step>
          </Stepper>

          {/* Step 1: Select System */}
          {fsStep === 'selectSystem' && (
            <Box sx={{ py: 2 }}>
              <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                Choose which system to scan:
              </Typography>
              {systems.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <SystemIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    No remote systems configured yet.
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => { setFsBrowserOpen(false); }}
                  >
                    Go to Systems page
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {systems.map((sys) => (
                    <Grid item xs={12} sm={6} md={4} key={sys.id}>
                      <Card
                        onClick={() => handleSystemSelected(sys.id)}
                        sx={{ cursor: 'pointer', height: '100%', border: '2px solid transparent', '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' } }}
                      >
                        <CardContent>
                          <Typography variant="h6" fontWeight={600}>
                            {sys.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {sys.protocol}://{sys.hostname}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {/* Step 2: Browse */}
          {fsStep === 'browse' && (
            <Box sx={{ py: 2 }}>
              {/* Breadcrumbs */}
              <Breadcrumbs sx={{ mb: 2 }}>
                <Link underline="hover" color="inherit" onClick={() => handleNavigateDir('/')}>
                  /
                </Link>
                {currentPath.split('/').filter(Boolean).map((seg, idx, arr) => {
                  const fullPath = '/' + arr.slice(0, idx + 1).join('/');
                  return (
                    <Link
                      key={fullPath}
                      underline="hover"
                      color="inherit"
                      onClick={() => handleNavigateDir(fullPath)}
                    >
                      {seg}
                    </Link>
                  );
                })}
              </Breadcrumbs>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                System: <strong>{systems.find(s => s.id === selectedSystemId)?.name}</strong> &nbsp;|&nbsp; Path: <code>{currentPath}</code>
              </Typography>

              {loadingFs ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, maxHeight: 500, overflow: 'auto' }}>
                  {fsEntries.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography color="text.secondary">No entries found</Typography>
                    </Box>
                  ) : (
                    fsEntries.map((entry) => (
                      <Box
                        key={entry.path}
                        sx={{
                          p: 2,
                          borderBottom: 1,
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          cursor: entry.isDir ? 'pointer' : 'default',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => !entry.isDir && handleInspectGGUF(entry.path)}
                      >
                        <FolderOpenIcon
                          sx={{ color: entry.isDir ? 'primary.main' : 'action.disabled' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (entry.isDir) handleNavigateDir(entry.path);
                          }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={entry.isDir ? 600 : 400}>
                            {entry.name}
                          </Typography>
                          {!entry.isDir && entry.size && (
                            <Typography variant="caption" color="text.secondary">
                              {(entry.size / (1024 * 1024 * 1024)).toFixed(2)} GB
                            </Typography>
                          )}
                        </Box>
                        {!entry.isDir && entry.path.endsWith('.gguf') && (
                          <Button size="small" onClick={() => handleInspectGGUF(entry.path)}>
                            Inspect
                          </Button>
                        )}
                      </Box>
                    ))
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Step 3: Inspect GGUF */}
          {fsStep === 'inspect' && ggufMetadata && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {ggufMetadata.name || 'Model'}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">Architecture</Typography>
                  <Typography variant="body1">{ggufMetadata.architecture || '—'}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">Parameters</Typography>
                  <Typography variant="body1">{ggufMetadata.parameterCount || '—'}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">Quantization</Typography>
                  <Typography variant="body1">{ggufMetadata.quantization || '—'}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">Size</Typography>
                  <Typography variant="body1">{ggufMetadata.sizeStr || '—'}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="body2" color="text.secondary">File Path</Typography>
                  <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>{ggufMetadata.filePath || '—'}</Typography>
                </Grid>
                {ggufMetadata.hasMmproj && (
                  <Grid item xs={12}>
                    <Chip label="Vision model companion detected" color="info" size="small" sx={{ mr: 1 }} />
                    {ggufMetadata.mmprojFiles?.map((f: string) => (
                      <Typography key={f} variant="caption" color="text.secondary" display="block">
                        {f}
                      </Typography>
                    ))}
                  </Grid>
                )}
              </Grid>
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button onClick={() => handleRegisterFromInspection()} variant="contained">
                  Register This Model
                </Button>
                <Button onClick={() => { setFsStep('browse'); setGgufMetadata(null); }} variant="outlined">
                  Back to Browse
                </Button>
              </Box>
            </Box>
          )}

          {fsStep === 'inspect' && !ggufMetadata && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setFsBrowserOpen(false); setFsStep('selectSystem'); }}>Close</Button>
          {fsStep !== 'selectSystem' && fsStep !== 'inspect' && (
            <Button onClick={() => setFsStep('selectSystem')}>Back to Systems</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── HuggingFace Search Dialog ── */}
      <Dialog open={hfOpen} onClose={() => setHfOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Search HuggingFace for Models</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="e.g. Qwen3.6-35B"
              value={hfQuery}
              onChange={(e) => setHfQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchHuggingFace()}
            />
            <Button
              variant="contained"
              onClick={searchHuggingFace}
              disabled={hfLoading || !hfQuery.trim()}
              startIcon={hfLoading ? <CircularProgress size={20} /> : <SearchIcon />}
            >
              Search
            </Button>
          </Box>
          {systems.length > 0 && (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Download to System</InputLabel>
              <Select
                value={selectedSystemId || ''}
                label="Download to System"
                onChange={(e) => setSelectedSystemId(e.target.value)}
              >
                {systems.map((sys) => (
                  <MenuItem key={sys.id} value={sys.id}>
                    {sys.name} ({sys.hostname})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {hfResults.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                Search for a model to see results
              </Typography>
            ) : (
              hfResults.map((model: any) => (
                <Box key={model.id} sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{model.id}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {model.downloads?.toLocaleString() || 0} downloads • {model.tags?.join(', ')}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CloudDownloadIcon />}
                    onClick={() => downloadFromHF(model.id)}
                    disabled={hfDownloading === model.id}
                  >
                    {hfDownloading === model.id ? 'Downloading...' : 'Download'}
                  </Button>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHfOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add/Edit Model Dialog ── */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingModel ? 'Edit Model' : 'Add Model'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Provider</InputLabel>
              <Select
                value={formData.providerId}
                label="Provider"
                onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                disabled={!!editingModel}
              >
                {providers.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Model Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              placeholder="Qwen3.6-35B-Q4_K_M"
            />
            <TextField
              label="Display Name (optional)"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              fullWidth
              placeholder="Qwen 3.6 35B"
            />
            <TextField
              label="Quantization (optional)"
              value={formData.quantization}
              onChange={(e) => setFormData({ ...formData, quantization: e.target.value })}
              fullWidth
              placeholder="Q4_K_M"
            />
            <TextField
              label="Size (GB)"
              value={formData.sizeGB}
              onChange={(e) => setFormData({ ...formData, sizeGB: e.target.value })}
              fullWidth
              type="number"
              placeholder="20.5"
            />
            <TextField
              label="Parameters (optional)"
              value={formData.parameters}
              onChange={(e) => setFormData({ ...formData, parameters: e.target.value })}
              fullWidth
              placeholder="35B"
            />
            <FormControl fullWidth>
              <InputLabel>Source</InputLabel>
              <Select
                value={formData.source}
                label="Source"
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              >
                {MODEL_SOURCES.map((source) => (
                  <MenuItem key={source.value} value={source.value}>
                    {source.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {formData.source === 'LOCAL' && (
              <TextField
                label="Download Path"
                value={formData.downloadPath}
                onChange={(e) => setFormData({ ...formData, downloadPath: e.target.value })}
                fullWidth
                placeholder="/models/Qwen3.6-35B.gguf"
              />
            )}
            {formData.source === 'MANUAL' && (
              <FormControl fullWidth>
                <InputLabel>Linked Vision Model (optional)</InputLabel>
                <Select
                  value={formData.visionModelId}
                  label="Linked Vision Model (optional)"
                  onChange={(e) => setFormData({ ...formData, visionModelId: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {models
                    .filter(m => m.providerId === formData.providerId && !m.name.toLowerCase().includes('mmproj'))
                    .map(m => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.displayName || m.name} {m.quantization ? `(${m.quantization})` : ''}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.providerId || !formData.name}
          >
            {editingModel ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
