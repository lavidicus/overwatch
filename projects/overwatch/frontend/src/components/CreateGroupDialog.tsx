import { Component, useEffect, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
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

const DEFAULT_ROLE: AgentRole = 'advisor';
const VALID_ROLE_VALUES = new Set<AgentRole>(ROLES.map(r => r.value));

function normalizeRole(role: AgentRole): AgentRole {
  return VALID_ROLE_VALUES.has(role) ? role : DEFAULT_ROLE;
}

interface DialogErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
}

interface DialogErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class CreateGroupDialogErrorBoundary extends Component<
  DialogErrorBoundaryProps,
  DialogErrorBoundaryState
> {
  state: DialogErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): DialogErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unexpected dialog error',
    };
  }

  componentDidUpdate(prevProps: DialogErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, message: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error">
          The panel form could not be displayed. {this.state.message}
        </Alert>
      );
    }

    return this.props.children;
  }
}

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

  const selectedToolIdsForSelect = useMemo(
    () => selectedToolIds.filter(id => tools.some(t => t.id === id)),
    [selectedToolIds, tools],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoadingModels(true);
    listAvailableAgents()
      .then(r => setAvailable(r.models))
      .catch(err => setError(err.message || 'Failed to load models'))
      .finally(() => setLoadingModels(false));
    // Load tools catalogue in parallel; non-fatal.
    listTools()
      .then(r => setTools(r.tools.filter(t => t.enabled)))
      .catch(() => setTools([]));
  }, [open]);

  useEffect(() => {
    if (!open) {
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

  useEffect(() => {
    if (providers.length === 0) return;

    setAgents(prev =>
      prev.map(agent => {
        const provider = providers.find(p => p.id === agent.providerId) || providers[0];
        const role = normalizeRole(agent.role);

        if (
          provider.id === agent.providerId &&
          provider.modelId === agent.modelId &&
          role === agent.role
        ) {
          return agent;
        }

        return {
          ...agent,
          providerId: provider.id,
          modelId: provider.modelId,
          role,
        };
      }),
    );
  }, [providers]);

  const addAgent = () => {
    if (providers.length === 0) return;
    // Pick the first provider
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
        a.uiId === uiId
          ? { ...a, ...patch, role: patch.role ? normalizeRole(patch.role) : a.role }
          : a,
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
        allowToolCalls,
        requireToolApproval,
        allowedToolIds:
          !allowToolCalls || allToolsSelected || selectedToolIdsForSelect.length === 0
            ? null
            : selectedToolIdsForSelect,
        agents: agents.map(({ uiId: _uiId, ...rest }, idx) => ({
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
        <CreateGroupDialogErrorBoundary resetKey={open ? 'open' : 'closed'}>
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
                      <InputLabel>Allowed tools</InputLabel>
                      <Select
                        key={tools.length}
                        multiple
                        value={selectedToolIdsForSelect}
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
                            <Checkbox checked={selectedToolIdsForSelect.includes(t.id)} />
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

            <Stack spacing={1.5}>
              {agents.map(agent => {
                const agentRole = normalizeRole(agent.role);
                const role = ROLES.find(r => r.value === agentRole);
                const providerValue = providers.some(p => p.id === agent.providerId)
                  ? agent.providerId
                  : providers[0]?.id || '';
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
                        sx={{ flex: 1, minWidth: 120 }}
                      />
                      {providers.length > 0 ? (
                        <Select
                          size="small"
                          label="Provider"
                          value={providers.length > 0 ? providerValue : ''}
                          defaultValue=""
                          onChange={e => {
                            const p = providers.find(x => x.id === e.target.value);
                            if (!p) return;
                            updateAgent(agent.uiId, {
                              providerId: p.id,
                              modelId: p.modelId,
                            });
                          }}
                          sx={{ minWidth: 220, flex: 2 }}
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
                      ) : (
                        <TextField
                          size="small"
                          label="Provider"
                          value="Loading providers…"
                          disabled
                          sx={{ minWidth: 220, flex: 2 }}
                        />
                      )}
                      <Select
                        size="small"
                        label="Role"
                        value={agentRole}
                        disabled={loadingModels}
                        onChange={e =>
                          updateAgent(agent.uiId, { role: e.target.value as AgentRole })
                        }
                        sx={{ minWidth: 140 }}
                      >
                        {ROLES.map(r => (
                          <MenuItem key={r.value} value={r.value}>
                            {r.label}
                          </MenuItem>
                        ))}
                      </Select>
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
        </CreateGroupDialogErrorBoundary>
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
