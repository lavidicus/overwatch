import { useEffect, useState, useMemo, useRef } from 'react';
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
import { updateGroup } from '../api/group-chat';
import { safeRandomUUID } from '../utils/uuid';

const ROLES: { value: AgentRole; label: string; hint: string }[] = [
  { value: 'facilitator', label: 'Facilitator', hint: 'Keeps the discussion on track' },
  { value: 'analyst', label: 'Analyst', hint: 'Data-driven, evaluates options objectively' },
  { value: 'critic', label: 'Critic', hint: 'Challenges assumptions, surfaces risks' },
  { value: 'advisor', label: 'Advisor', hint: 'General contributor' },
];

interface AgentDraft extends Omit<GroupAgentInput, 'systemPrompt' | 'modelId'> {
  uiId: string;
  providerId: string;
  modelId: string | null;
  systemPrompt: string | null;
}

interface ProviderSummary {
  id: string;
  name: string;
  type: string;
  modelId: string;
  modelName: string;
}

export interface EditGroupData {
  id: string;
  name: string;
  description: string | null;
  maxRounds: number;
  allowToolCalls: boolean;
  requireToolApproval: boolean;
  allowedToolIds: string[] | null;
  judgeProviderId: string | null;
  judgeModelId: string | null;
  agents: { agentName: string; providerId: string; modelId: string | null; role: AgentRole; systemPrompt: string | null; position?: number }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (groupId: string) => void;
  editData?: EditGroupData;
}

export default function CreateGroupDialog({ open, onClose, onCreated, editData }: Props) {
  const isEditing = !!editData;
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
  const [judgeProviderId, setJudgeProviderId] = useState<string | undefined>(undefined);
  // judgeModelId is auto-derived from provider, kept internally but not user-editable
  const [judgeModelId, setJudgeModelId] = useState<string | undefined>(undefined);

  // Group models by provider: providerId -> list of models
  const providerModels = useMemo<Record<string, AvailableAgent[]>>(() => {
    const map: Record<string, AvailableAgent[]> = {};
    for (const m of available) {
      if (!map[m.providerId]) map[m.providerId] = [];
      map[m.providerId].push(m);
    }
    return map;
  }, [available]);

  // Unique provider list (first model of each provider as default)
  const providers = useMemo<ProviderSummary[]>(() => {
    return Object.entries(providerModels).map(([id, models]) => ({
      id,
      name: models[0].providerName,
      type: models[0].providerType,
      modelId: models[0].modelId,
      modelName: models[0].displayName || models[0].modelName,
    }));
  }, [providerModels]);

  // Keep a ref to the latest providers so addAgent always sees fresh data
  const providersRef = useRef(providers);
  providersRef.current = providers;

  // Ensure selectedToolIds only contains valid tool IDs
  const validSelectedToolIds = useMemo(
    () => selectedToolIds.filter(id => tools.some(t => t.id === id)),
    [selectedToolIds, tools],
  );

  const selectedJudgeProviderId = judgeProviderId || providers[0]?.id || '';
  const selectedJudgeModels = selectedJudgeProviderId ? (providerModels[selectedJudgeProviderId] || []) : [];
  const selectedJudgeModelId = judgeModelId || selectedJudgeModels[0]?.modelId || '';

  // Populate or reset form fields when dialog opens/closes
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

      // Populate from editData in edit mode
      if (editData) {
        setName(editData.name);
        setDescription(editData.description || '');
        setMaxRounds(editData.maxRounds);
        setAllowToolCalls(editData.allowToolCalls);
        setRequireToolApproval(editData.requireToolApproval);
        const toolIds = editData.allowedToolIds ?? [];
        setSelectedToolIds(toolIds);
        setAllToolsSelected(toolIds.length === 0);
        setJudgeProviderId(editData.judgeProviderId ?? undefined);
        setJudgeModelId(editData.judgeModelId ?? undefined);
        setAgents(editData.agents.map(a => ({
          uiId: a.providerId + a.modelId + a.agentName + safeRandomUUID(),
          agentName: a.agentName,
          providerId: a.providerId,
          modelId: a.modelId || '',
          role: a.role,
          systemPrompt: a.systemPrompt || null,
          position: a.position,
        })));
      } else {
        setName('');
        setDescription('');
        setMaxRounds(5);
        setAgents([]);
        setAllowToolCalls(true);
        setRequireToolApproval(true);
        setSelectedToolIds([]);
        setAllToolsSelected(true);
        setJudgeProviderId(undefined);
        setJudgeModelId(undefined);
      }
    } else {
      setName('');
      setDescription('');
      setMaxRounds(5);
      setAgents([]);
      setAllowToolCalls(true);
      setRequireToolApproval(true);
      setSelectedToolIds([]);
      setAllToolsSelected(true);
      setJudgeProviderId(undefined);
      setJudgeModelId(undefined);
    }
  }, [open, editData]);

  // Reset error when dialog re-opens
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  // Initialize judge selection after models load, and keep the model valid when the provider changes.
  useEffect(() => {
    if (!open || loadingModels || providers.length === 0) return;

    const provider = providers.find(p => p.id === judgeProviderId) ?? providers[0];
    const models = providerModels[provider.id] || [];
    const currentModelIsValid = !!judgeModelId && models.some(m => m.modelId === judgeModelId);

    if (judgeProviderId !== provider.id) {
      setJudgeProviderId(provider.id);
    }
    if (!currentModelIsValid) {
      setJudgeModelId(models[0]?.modelId ?? provider.modelId);
    }
  }, [open, loadingModels, providers, providerModels, judgeProviderId, judgeModelId]);

  const addAgent = () => {
    if (providersRef.current.length === 0 || loadingModels) return;
    const prov = providersRef.current[0];
    if (!prov) return;
    const models = providerModels[prov.id] || [];
    setAgents(prev => [
      ...prev,
      {
        uiId: safeRandomUUID(),
        agentName: `${prov.name} ${prev.length + 1}`,
        providerId: prov.id,
        modelId: models.length > 0 ? models[0].modelId : prov.modelId,
        role: prev.length === 0 ? 'facilitator' : 'advisor',
        systemPrompt: null,
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
      setError('Panel name is required');
      return;
    }
    if (agents.length === 0) {
      setError('Add at least one advisor');
      return;
    }
    const submitJudgeProviderId = judgeProviderId || selectedJudgeProviderId;
    // judgeModelId is auto-derived from provider, no need to validate separately
    if (!submitJudgeProviderId) {
      setError('Judge provider is required');
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
      const agentPayload = agents.map(({ uiId: _uiId, systemPrompt, ...rest }, idx) => ({
        ...rest,
        position: idx,
        systemPrompt: systemPrompt ?? undefined,
      }));
      if (isEditing && editData) {
        await updateGroup(editData.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          maxRounds,
          judgeProviderId: submitJudgeProviderId,
          // judgeModelId is auto-derived by backend from provider
          allowToolCalls,
          requireToolApproval,
          allowedToolIds:
            !allowToolCalls || allToolsSelected || validSelectedToolIds.length === 0
              ? null
              : validSelectedToolIds,
          agents: agentPayload,
        });
        onClose();
      } else {
        const result = await createGroup({
          name: name.trim(),
          description: description.trim() || undefined,
          maxRounds,
          judgeProviderId: submitJudgeProviderId,
          // judgeModelId is auto-derived by backend from provider
          allowToolCalls,
          requireToolApproval,
          allowedToolIds:
            !allowToolCalls || allToolsSelected || validSelectedToolIds.length === 0
              ? null
              : validSelectedToolIds,
          agents: agentPayload,
        });
        onCreated(result.group.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save panel');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  if (!rendered) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEditing ? 'Edit AI Panel' : 'New AI Panel'}</DialogTitle>
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
              Judge Configuration
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              The judge evaluates whether consensus has been reached after each round. The model is auto-selected from the provider.
            </Typography>
            {loadingModels ? (
              <Typography variant="body2" color="text.secondary">
                Loading available providers…
              </Typography>
            ) : providers.length === 0 ? (
              <Alert severity="warning">
                No ready providers found. Add and start a provider on the Providers page first.
              </Alert>
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
                  <Select
                    value={selectedJudgeProviderId}
                    onChange={e => {
                      const p = providers.find(x => x.id === e.target.value);
                      if (!p) return;
                      const models = providerModels[p.id] || [];
                      setJudgeProviderId(p.id);
                      setJudgeModelId(models.length > 0 ? models[0].modelId : p.modelId);
                    }}
                  >
                    {providers.map(p => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name} ({p.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 2 }}>
                  Model: <strong>{selectedJudgeModels[0]?.displayName || selectedJudgeModels[0]?.modelName || 'Auto-selected'}</strong>
                </Typography>
              </Stack>
            )}
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

              // Ensure provider value is valid (fallback to first provider)
              const providerId = agent.providerId;
              const providerValue =
                providerId && providers.find(p => p.id === providerId)
                  ? providerId
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
                      <>
                        <FormControl size="small" sx={{ minWidth: 200, flex: 2 }}>
                          <Select
                            value={providerValue || providers[0]?.id || ''}
                            onChange={e => {
                              const p = providers.find(x => x.id === e.target.value);
                              if (!p) return;
                              const models = providerModels[p.id] || [];
                              updateAgent(agent.uiId, {
                                providerId: p.id,
                                modelId: models.length > 0 ? models[0].modelId : p.modelId,
                              });
                            }}
                          >
                            {providers.map(p => (
                              <MenuItem key={p.id} value={p.id}>
                                {p.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 200, flex: 3 }}>
                          <Select
                            value={agent.modelId || ''}
                            disabled={loadingModels}
                            onChange={e => updateAgent(agent.uiId, { modelId: e.target.value })}
                          >
                            {(providerModels[agent.providerId] || []).map(m => (
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
                      </>
                    ) : (
                      <>
                        <TextField
                          size="small"
                          label="Provider"
                          value="Loading…"
                          disabled
                          sx={{ minWidth: 200, flex: 2 }}
                        />
                        <TextField
                          size="small"
                          label="Model"
                          value="Loading…"
                          disabled
                          sx={{ minWidth: 200, flex: 3 }}
                        />
                      </>
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
        <Button onClick={onClose}>{isEditing ? 'Cancel' : 'Cancel'}</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || agents.length === 0 || !name.trim()}
        >
          {submitting ? 'Saving…' : isEditing ? 'Save panel' : 'Create panel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
