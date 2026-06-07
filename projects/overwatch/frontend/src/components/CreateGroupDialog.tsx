import { useEffect, useState, useMemo } from 'react';
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
  Stack,
  Chip,
  Slider,
  Alert,
  FormControlLabel,
  Switch,
  Checkbox,
  ListItemText,
  OutlinedInput,
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
import { listTools, Tool } from '../api/tools';

const ROLES: { value: AgentRole; label: string; hint: string }[] = [
  { value: 'facilitator', label: 'Facilitator', hint: 'Keeps the discussion on track' },
  { value: 'analyst', label: 'Analyst', hint: 'Data-driven, evaluates options objectively' },
  { value: 'critic', label: 'Critic', hint: 'Challenges assumptions, surfaces risks' },
  { value: 'advisor', label: 'Advisor', hint: 'General contributor' },
];

interface AgentDraft extends GroupAgentInput {
  uiId: string;
  providerId: string;
}

interface ProviderSummary {
  id: string;
  name: string;
  type: string;
  modelId: string;
  modelName: string;
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
  const [allowToolCalls, setAllowToolCalls] = useState(true);
  const [requireToolApproval, setRequireToolApproval] = useState(true);
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [allToolsSelected, setAllToolsSelected] = useState(true);
  const [rendered, setRendered] = useState(false);

  // Build unique provider list from available models
  const providers = useMemo<ProviderSummary[]>(() => {
    const seen = new Set<string>();
    return available
      .filter(m => {
        const key = m.providerId;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(m => ({
        id: m.providerId,
        name: m.providerName,
        type: m.providerType,
        modelId: m.modelId,
        modelName: m.displayName || m.modelName,
      }));
  }, [available]);

  // Ensure selectedToolIds only contains valid tool IDs
  const validSelectedToolIds = useMemo(
    () => selectedToolIds.filter(id => tools.some(t => t.id === id)),
    [selectedToolIds, tools],
  );

  // Force re-render after dialog opens
  useEffect(() => {
    if (open) {
      setRendered(true);
      setError(null);
      setLoadingModels(true);

      listAvailableAgents()
        .then(r => setAvailable(r.models))
        .catch(err => setError(err.message || 'Failed to load models'))
        .finally(() => setLoadingModels(false));

      listTools()
        .then(r => setTools(r.tools.filter(t => t.enabled)))
        .catch(() => setTools([]));
    } else {
      setName('');
      setDescription('');
      setMaxRounds(5);
      setAgents([]);
      setAllowToolCalls(true);
      setRequireToolApproval(true);
      setSelectedToolIds([]);
      setAllToolsSelected(true);
    }
  }, [open]);

  // Reset error when dialog re-opens
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const addAgent = () => {
    if (providers.length === 0 || loadingModels) return;
    const prov = providers[0];
    setAgents(prev => [
      ...prev,
      {
        uiId: crypto.randomUUID(),
        agentName: `${prov.name} ${prev.length + 1}`,
        providerId: prov.id,
        modelId: prov.modelId,
        role: prev.length === 0 ? 'facilitator' : 'advisor',
        position: prev.length,
      },
    ]);
  };

  const removeAgent = (uiId: string) =>
    setAgents(prev => prev.filter(a => a.uiId !== uiId));

  const updateAgent = (uiId: string, patch: Partial<AgentDraft>) =>
    setAgents(prev =>
      prev.map(a =>
        a.uiId === uiId ? { ...a, ...patch, role: (patch.role ?? a.role) as AgentRole } : a,
      ),
    );

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    if (agents.length === 0) {
      setError('Add at least one agent');
      return;
    }
    const names = new Set<string>();
    for (const a of agents) {
      const n = a.agentName.trim();
      if (!n) { setError('All agents need a name'); return; }
      if (names.has(n)) { setError(`Duplicate agent name: ${n}`); return; }
      names.add(n);
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        maxRounds,
        allowToolCalls,
        requireToolApproval,
        allowedToolIds:
          !allowToolCalls || allToolsSelected || validSelectedToolIds.length === 0
            ? null
            : validSelectedToolIds,
        agents: agents.map(({ uiId: _uiId, ...rest }, idx) => ({ ...rest, position: idx })),
      });
      onCreated(result.group.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  if (!rendered) return null;

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

          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: 1.5,
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Tool calling
            </Typography>
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={allowToolCalls}
                    onChange={e => setAllowToolCalls(e.target.checked)}
                  />
                }
                label="Enable tool calls for this panel"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={requireToolApproval}
                    onChange={e => setRequireToolApproval(e.target.checked)}
                    disabled={!allowToolCalls}
                  />
                }
                label="Require approval for tool calls (recommended)"
              />
              {allowToolCalls && (
                <>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={allToolsSelected}
                        onChange={e => setAllToolsSelected(e.target.checked)}
                      />
                    }
                    label="Allow all enabled tools"
                  />
                  {!allToolsSelected && (
                    <FormControl size="small" fullWidth>
                      <Select
                        multiple
                        value={validSelectedToolIds}
                        input={<OutlinedInput label="Allowed tools" />}
                        onChange={e => {
                          const v = e.target.value;
                          setSelectedToolIds(
                            typeof v === 'string' ? v.split(',') : (v as string[]),
                          );
                        }}
                        renderValue={selected =>
                          tools
                            .filter(t => (selected as string[]).includes(t.id))
                            .map(t => t.name)
                            .join(', ')
                        }
                      >
                        {tools.map(t => (
                          <MenuItem key={t.id} value={t.id}>
                            <Checkbox checked={validSelectedToolIds.includes(t.id)} />
                            <ListItemText
                              primary={t.name}
                              secondary={
                                t.requiresApproval
                                  ? `${t.category} — approval required`
                                  : t.category
                              }
                            />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </>
              )}
            </Stack>
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
                disabled={providers.length === 0 || agents.length >= 8 || loadingModels}
              >
                Add advisor
              </Button>
            </Stack>

            {loadingModels && (
              <Typography variant="body2" color="text.secondary">
                Loading available providers…
              </Typography>
            )}
            {!loadingModels && providers.length === 0 && (
              <Alert severity="warning">
                No ready providers found. Add and start a provider on the Providers page first.
              </Alert>
            )}

            {agents.map(agent => {
              // Ensure role is valid
              const roleValue = (ROLES.find(r => r.value === agent.role)
                ? agent.role
                : 'advisor') as AgentRole;

              // Ensure provider value is valid
              const providerValue = providers.find(p => p.id === agent.providerId)
                ? agent.providerId
                : (providers.length > 0 ? providers[0].id : '');

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
                      value={agent.agentName || ''}
                      onChange={e => updateAgent(agent.uiId, { agentName: e.target.value })}
                      sx={{ flex: 1, minWidth: 120 }}
                    />
                    {providers.length > 0 ? (
                      <FormControl size="small" sx={{ minWidth: 220, flex: 2 }}>
                        <Select
                          value={providerValue || ''}
                          onChange={e => {
                            const p = providers.find(x => x.id === e.target.value);
                            if (!p) return;
                            updateAgent(agent.uiId, {
                              providerId: p.id,
                              modelId: p.modelId,
                            });
                          }}
                        >
                          {providers.map(p => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.name}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ ml: 1 }}
                              >
                                ({p.type} — {p.modelName})
                              </Typography>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField
                        size="small"
                        label="Provider"
                        value="Loading…"
                        disabled
                        sx={{ minWidth: 220, flex: 2 }}
                      />
                    )}
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <Select
                        value={roleValue}
                        disabled={loadingModels}
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
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.5 }}
                  >
                    {ROLES.find(r => r.value === roleValue)?.hint || ''}
                  </Typography>
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
