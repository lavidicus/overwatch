import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  Slider,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import {
  AvailableAgent,
  GroupAgentInput,
  createGroup,
  listAvailableAgents,
  AgentRole,
} from '../api/group-chat';

const ROLES: { value: AgentRole; label: string; hint: string }[] = [
  { value: 'facilitator', label: 'Facilitator', hint: 'Keeps the discussion on track' },
  { value: 'analyst', label: 'Analyst', hint: 'Data-driven, evaluates options objectively' },
  { value: 'critic', label: 'Critic', hint: 'Challenges assumptions, surfaces risks' },
  { value: 'advisor', label: 'Advisor', hint: 'General contributor' },
];

interface AgentDraft extends GroupAgentInput {
  uiId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (groupId: string) => void;
}

export default function CreateGroupDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxRounds, setMaxRounds] = useState(5);
  const [agents, setAgents] = useState<AgentDraft[]>([]);
  const [available, setAvailable] = useState<AvailableAgent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoadingModels(true);
    listAvailableAgents()
      .then(r => setAvailable(r.models))
      .catch(err => setError(err.message || 'Failed to load models'))
      .finally(() => setLoadingModels(false));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setMaxRounds(5);
      setAgents([]);
    }
  }, [open]);

  const addAgent = () => {
    if (available.length === 0) return;
    const first = available[0];
    setAgents(prev => [
      ...prev,
      {
        uiId: crypto.randomUUID(),
        agentName: `${first.displayName || first.modelName} ${prev.length + 1}`,
        providerId: first.providerId,
        modelId: first.modelId,
        role: prev.length === 0 ? 'facilitator' : 'advisor',
        position: prev.length,
      },
    ]);
  };

  const removeAgent = (uiId: string) =>
    setAgents(prev => prev.filter(a => a.uiId !== uiId));

  const updateAgent = (uiId: string, patch: Partial<AgentDraft>) =>
    setAgents(prev => prev.map(a => (a.uiId === uiId ? { ...a, ...patch } : a)));

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    if (agents.length === 0) {
      setError('Add at least one agent');
      return;
    }
    // Name uniqueness within the group:
    const names = new Set<string>();
    for (const a of agents) {
      const n = a.agentName.trim();
      if (!n) {
        setError('All agents need a name');
        return;
      }
      if (names.has(n)) {
        setError(`Duplicate agent name: ${n}`);
        return;
      }
      names.add(n);
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        maxRounds,
        agents: agents.map(({ uiId, ...rest }, idx) => ({
          ...rest,
          position: idx,
        })),
      });
      onCreated(result.group.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>New AI Panel</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          <TextField
            label="Panel name"
            value={name}
            onChange={e => setName(e.target.value)}
            fullWidth
            autoFocus
            required
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={1}
            maxRows={3}
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Max rounds: <strong>{maxRounds}</strong>
            </Typography>
            <Slider
              value={maxRounds}
              onChange={(_, v) => setMaxRounds(v as number)}
              min={1}
              max={10}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>

          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Advisors</Typography>
              <Chip
                size="small"
                label={`${agents.length} / 8`}
                color={agents.length > 0 ? 'primary' : 'default'}
              />
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addAgent}
                disabled={available.length === 0 || agents.length >= 8 || loadingModels}
              >
                Add advisor
              </Button>
            </Stack>

            {loadingModels && (
              <Typography variant="body2" color="text.secondary">
                Loading available models…
              </Typography>
            )}
            {!loadingModels && available.length === 0 && (
              <Alert severity="warning">
                No ready provider models found. Add and start a model on the Models page first.
              </Alert>
            )}

            <Stack spacing={1.5}>
              {agents.map(agent => {
                const role = ROLES.find(r => r.value === agent.role);
                return (
                  <Box
                    key={agent.uiId}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1.5,
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                      <TextField
                        label="Display name"
                        size="small"
                        value={agent.agentName}
                        onChange={e => updateAgent(agent.uiId, { agentName: e.target.value })}
                        sx={{ flex: 1, minWidth: 140 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 220, flex: 2 }}>
                        <InputLabel>Model</InputLabel>
                        <Select
                          label="Model"
                          value={agent.modelId || ''}
                          onChange={e => {
                            const m = available.find(x => x.modelId === e.target.value);
                            if (!m) return;
                            updateAgent(agent.uiId, {
                              modelId: m.modelId,
                              providerId: m.providerId,
                            });
                          }}
                        >
                          {available.map(m => (
                            <MenuItem key={m.modelId} value={m.modelId}>
                              {m.displayName || m.modelName}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ ml: 1 }}
                              >
                                ({m.providerName})
                              </Typography>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Role</InputLabel>
                        <Select
                          label="Role"
                          value={agent.role}
                          onChange={e =>
                            updateAgent(agent.uiId, { role: e.target.value as AgentRole })
                          }
                        >
                          {ROLES.map(r => (
                            <MenuItem key={r.value} value={r.value}>
                              {r.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <IconButton
                        size="small"
                        onClick={() => removeAgent(agent.uiId)}
                        aria-label="Remove agent"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    {role && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        {role.hint}
                      </Typography>
                    )}
                    <TextField
                      label="Custom system prompt (optional)"
                      size="small"
                      multiline
                      minRows={1}
                      maxRows={4}
                      value={agent.systemPrompt || ''}
                      onChange={e =>
                        updateAgent(agent.uiId, { systemPrompt: e.target.value })
                      }
                      fullWidth
                      sx={{ mt: 1 }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || agents.length === 0 || !name.trim()}
        >
          {submitting ? 'Creating…' : 'Create panel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
