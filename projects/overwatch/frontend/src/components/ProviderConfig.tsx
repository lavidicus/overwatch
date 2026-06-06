import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, FormControl, FormLabel, RadioGroup, Radio, FormControlLabel, Typography,
  Box, CircularProgress, Switch, Divider,
} from '@mui/material';
import { getAuthToken } from '../utils/auth';

interface Provider {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  model: string;
}

interface ProviderConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (providerId: string, model: string, opts: { isAgentChat: boolean }) => void;
  initialProviderId?: string;
  initialModel?: string;
  initialAgentMode?: boolean;
}

export default function ProviderConfigDialog({ open, onClose, onSelect, initialProviderId, initialModel, initialAgentMode = true }: ProviderConfigDialogProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState(initialProviderId || '');
  const [selectedModel, setSelectedModel] = useState(initialModel || '');
  const [agentMode, setAgentMode] = useState<boolean>(initialAgentMode);

  useEffect(() => {
    if (open) {
      fetchProviders();
    }
  }, [open]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/providers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        if (data.providers.length > 0 && !selectedProviderId) {
          setSelectedProviderId(data.providers[0].id);
          setSelectedModel(data.providers[0].model);
        }
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    }
    setLoading(false);
  };

  const handleSelect = () => {
    if (selectedProviderId && selectedModel) {
      onSelect(selectedProviderId, selectedModel, { isAgentChat: agentMode });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Provider & Model</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ pt: 1 }}>
            <FormControl>
              <FormLabel>Provider</FormLabel>
              <RadioGroup value={selectedProviderId} onChange={e => {
                setSelectedProviderId(e.target.value);
                const provider = providers.find(p => p.id === e.target.value);
                if (provider) setSelectedModel(provider.model);
              }}>
                {providers.map(p => (
                  <FormControlLabel key={p.id} value={p.id} control={<Radio />}
                    label={`${p.name} (${p.type})`} />
                ))}
              </RadioGroup>
            </FormControl>
            {selectedProviderId && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Model: <strong>{selectedModel}</strong>
                </Typography>
              </Box>
            )}
            <Divider sx={{ my: 2 }} />
            <FormControlLabel
              control={<Switch checked={agentMode} onChange={(e) => setAgentMode(e.target.checked)} />}
              label="Agent mode (enable tool calling)"
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              When on, the assistant can call tools (filesystem, shell, etc.) to answer your messages.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSelect} variant="contained" disabled={!selectedProviderId || !selectedModel}>
          Select
        </Button>
      </DialogActions>
    </Dialog>
  );
}
