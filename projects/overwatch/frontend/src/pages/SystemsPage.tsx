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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Computer as SystemIcon,
  Sync as SyncIcon,
  Memory as HardwareIcon,
  FolderOpen as FolderOpenIcon,
} from '@mui/icons-material';
import { systemsApi, modelsApi } from '../services/api';

interface System {
  id: string;
  name: string;
  hostname: string;
  port: number;
  protocol: string;
  username: string;
  authType: string;
  active: boolean;
  createdAt: string;
  hardwareInfo?: any;
  installations?: any[];
}

const PROTOCOLS = [
  { value: 'SSH', label: 'SSH' },
  { value: 'LOCAL', label: 'Local' },
];

const AUTH_TYPES = [
  { value: 'PASSWORD', label: 'Password' },
  { value: 'SSH_KEY', label: 'SSH Key' },
  { value: 'KEY_PAIR', label: 'Key Pair' },
];

export default function SystemsPage() {
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<System | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    port: '22',
    protocol: 'SSH',
    username: '',
    authType: 'SSH_KEY',
    password: '',
    sshKey: '',
    keyPassword: '',
  });

  useEffect(() => {
    loadSystems();
  }, []);

  const loadSystems = async () => {
    try {
      setLoading(true);
      const response = await systemsApi.list();
      setSystems(response.data.systems || []);
    } catch (error) {
      console.error('Failed to load systems:', error);
      setAlert({ type: 'error', message: 'Failed to load systems' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (system?: System) => {
    if (system) {
      setEditingSystem(system);
      setFormData({
        name: system.name,
        hostname: system.hostname,
        port: system.port.toString(),
        protocol: system.protocol,
        username: system.username,
        authType: system.authType,
        password: '',
        sshKey: '',
        keyPassword: '',
      });
    } else {
      setEditingSystem(null);
      setFormData({
        name: '',
        hostname: '',
        port: '22',
        protocol: 'SSH',
        username: '',
        authType: 'SSH_KEY',
        password: '',
        sshKey: '',
        keyPassword: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSystem(null);
  };

  const handleSubmit = async () => {
    try {
      const data: any = {
        name: formData.name,
        hostname: formData.hostname,
        port: parseInt(formData.port),
        protocol: formData.protocol,
        username: formData.username,
        authType: formData.authType,
      };

      // Only include credentials if they're provided (for updates)
      if (formData.password) data.password = formData.password;
      if (formData.sshKey) data.sshKey = formData.sshKey;
      if (formData.keyPassword) data.keyPassword = formData.keyPassword;

      if (editingSystem) {
        await systemsApi.update(editingSystem.id, data);
        setAlert({ type: 'success', message: 'System updated successfully' });
      } else {
        await systemsApi.create(data);
        setAlert({ type: 'success', message: 'System added successfully' });
      }

      handleCloseDialog();
      loadSystems();
    } catch (error: any) {
      console.error('Failed to save system:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Failed to save system',
      });
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      setTestingId(id);
      const response = await systemsApi.testConnection(id);
      
      setAlert({
        type: response.data.success ? 'success' : 'error',
        message: response.data.message,
      });

      loadSystems();
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

  const handleRunWhatLLM = async (id: string) => {
    try {
      setAnalyzingId(id);
      setAlert({ type: 'success', message: 'Running WhichLLM analysis...' });
      
      const response = await systemsApi.runWhatllm(id);
      
      setAlert({
        type: 'success',
        message: `Analysis complete! Found ${response.data.recommendations?.length || 0} model recommendations`,
      });

      loadSystems();
    } catch (error: any) {
      console.error('WhichLLM analysis failed:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'WhichLLM analysis failed',
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleScanForModels = async (id: string) => {
    try {
      setScanningId(id);
      setAlert({ type: 'success', message: 'Scanning for GGUF models...' });
      
      const response = await modelsApi.scanSystemModels(id);
      
      setAlert({
        type: 'success',
        message: `Found ${response.data.files?.length || 0} GGUF files in ${response.data.basePath}`,
      });

      // Navigate to Models page to show results
      window.location.href = '/models?scanResult=' + encodeURIComponent(JSON.stringify(response.data));
    } catch (error: any) {
      console.error('Model scan failed:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Failed to scan for models',
      });
    } finally {
      setScanningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this system?')) return;

    try {
      await systemsApi.delete(id);
      setAlert({ type: 'success', message: 'System deleted successfully' });
      loadSystems();
    } catch (error: any) {
      console.error('Delete failed:', error);
      setAlert({ type: 'error', message: 'Failed to delete system' });
    }
  };

  const getHardwareSummary = (hardware?: any) => {
    if (!hardware) return null;
    
    const parts = [];
    if (hardware.cpuCores) parts.push(`${hardware.cpuCores} cores`);
    if (hardware.ramGB) parts.push(`${hardware.ramGB}GB RAM`);
    if (hardware.gpuInfo && hardware.gpuInfo.length > 0) {
      const totalVram = hardware.gpuInfo.reduce((sum: number, gpu: any) => sum + (gpu.vramGB || 0), 0);
      parts.push(`${hardware.gpuInfo.length}x GPU (${totalVram}GB VRAM)`);
    }
    
    return parts.join(' • ');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SystemIcon fontSize="large" color="primary" />
          <Typography variant="h4" fontWeight={700}>
            Remote Systems
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add System
        </Button>
      </Box>

      {/* Alert */}
      {alert && (
        <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb: 3 }}>
          {alert.message}
        </Alert>
      )}

      {/* Systems Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : systems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SystemIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No systems configured
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add remote systems to manage LLM installations and run hardware analysis
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {systems.map((system) => (
            <Grid item xs={12} sm={6} md={4} key={system.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {system.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {system.protocol === 'LOCAL' ? 'Local System' : `${system.hostname}:${system.port}`}
                      </Typography>
                    </Box>
                    <Chip
                      label={system.active ? 'Active' : 'Inactive'}
                      color={system.active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2">
                      <strong>Username:</strong> {system.username}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Auth:</strong>{' '}
                      {AUTH_TYPES.find((a) => a.value === system.authType)?.label || system.authType}
                    </Typography>
                    
                    {system.hardwareInfo && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          <strong>Hardware:</strong>
                        </Typography>
                        <Typography variant="body2">
                          {getHardwareSummary(system.hardwareInfo)}
                        </Typography>
                        {system.hardwareInfo.whatllmRecs && (
                          <Chip
                            label={`${system.hardwareInfo.whatllmRecs.length} recommendations`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </>
                    )}
                  </Box>
                </CardContent>

                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    onClick={() => handleTestConnection(system.id)}
                    disabled={testingId === system.id}
                  >
                    {testingId === system.id ? <CircularProgress size={20} /> : <SyncIcon />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleRunWhatLLM(system.id)}
                    disabled={analyzingId === system.id}
                    title="Run WhichLLM Analysis"
                  >
                    {analyzingId === system.id ? <CircularProgress size={20} /> : <HardwareIcon />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleScanForModels(system.id)}
                    disabled={scanningId === system.id}
                    title="Scan for GGUF Models"
                  >
                    {scanningId === system.id ? <CircularProgress size={20} /> : <FolderOpenIcon />}
                  </IconButton>
                  <IconButton size="small" onClick={() => handleOpenDialog(system)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(system.id)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSystem ? 'Edit System' : 'Add System'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              placeholder="vllm-server-01"
            />
            <TextField
              label="Hostname / IP"
              value={formData.hostname}
              onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
              fullWidth
              required
              disabled={formData.protocol === 'LOCAL'}
              placeholder="192.168.1.100"
            />
            <TextField
              label="Port"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: e.target.value })}
              fullWidth
              type="number"
              disabled={formData.protocol === 'LOCAL'}
              placeholder="22"
            />
            <TextField
              select
              label="Protocol"
              value={formData.protocol}
              onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
              fullWidth
            >
              {PROTOCOLS.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              fullWidth
              required
              placeholder="root"
            />
            <TextField
              select
              label="Auth Type"
              value={formData.authType}
              onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
              fullWidth
            >
              {AUTH_TYPES.map((a) => (
                <MenuItem key={a.value} value={a.value}>
                  {a.label}
                </MenuItem>
              ))}
            </TextField>

            {formData.authType === 'PASSWORD' && (
              <TextField
                label="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                fullWidth
                type="password"
              />
            )}

            {(formData.authType === 'SSH_KEY' || formData.authType === 'KEY_PAIR') && (
              <>
                <TextField
                  label="SSH Private Key"
                  value={formData.sshKey}
                  onChange={(e) => setFormData({ ...formData, sshKey: e.target.value })}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                />
                <TextField
                  label="Key Passphrase (optional)"
                  value={formData.keyPassword}
                  onChange={(e) => setFormData({ ...formData, keyPassword: e.target.value })}
                  fullWidth
                  type="password"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name || !formData.hostname || !formData.username}
          >
            {editingSystem ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
