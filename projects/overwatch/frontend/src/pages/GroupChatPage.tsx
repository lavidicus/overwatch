import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import {
  ChatGroupDetail,
  GroupSummary,
  RoundTranscript,
  deleteGroup,
  getGroup,
  getGroupHistory,
  listGroups,
  runConsensus,
} from '../api/group-chat';
import { initSocket } from '../hooks/useSocket';
import CreateGroupDialog from '../components/CreateGroupDialog';
import { approveInvocation, rejectInvocation } from '../api/tools';

const DRAWER_WIDTH = 300;

// Stable color palette per agent.
const AGENT_PALETTE = [
  '#1976d2', // blue
  '#e91e63', // pink
  '#388e3c', // green
  '#f57c00', // orange
  '#7b1fa2', // purple
  '#0097a7', // teal
  '#c62828', // red
  '#5d4037', // brown
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AGENT_PALETTE[hash % AGENT_PALETTE.length];
}

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('');
}

// ────────────────────────── Tool event types ──────────────────────────

interface ToolEvent {
  kind: 'call' | 'result';
  agentName: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
  ok?: boolean;
  error?: string;
  invocationId?: string;
  status?: string;
  requiresApproval?: boolean;
}

interface LiveAgentUpdate {
  agentName: string;
  role: string;
  message: string;
  status: 'thinking' | 'done' | 'error';
  error?: string | null;
}

interface LiveRound {
  roundId: string;
  roundNumber: number;
  agents: LiveAgentUpdate[];
  judgeAnalysis: string | null;
  reachedConsensus: boolean | null;
  finalConsensus: string | null;
  inProgress: boolean;
  toolEvents: ToolEvent[];
}

interface AugmentedRoundTranscript extends RoundTranscript {
  toolEvents: ToolEvent[];
}

// ────────────────────────── Helpers ──────────────────────────

function parseToolMessage(raw: string): Record<string, unknown> | null {
  try {
    const o = JSON.parse(raw);
    return typeof o === 'object' && o !== null ? (o as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function toolEventFromPayload(
  payload: Record<string, unknown>,
  kind: 'call' | 'result',
  agentName: string,
): ToolEvent {
  return {
    kind,
    agentName,
    toolName: (payload.name as string) || 'tool',
    args: payload.arguments as Record<string, unknown> | undefined,
    result: payload.result,
    ok: payload.ok as boolean | undefined,
    error: payload.error as string | undefined,
    invocationId: payload.invocationId as string | undefined,
    status: payload.status as string | undefined,
    requiresApproval: payload.requiresApproval as boolean | undefined,
  };
}

function transformRounds(
  rounds: Awaited<ReturnType<typeof getGroupHistory>>['rounds'],
): AugmentedRoundTranscript[] {
  return rounds.map(r => {
    const turns = r.messages
      .filter(m => m.role === 'response')
      .map(m => ({
        agentName: m.agentName,
        role: m.role,
        message: m.message,
        durationMs: 0,
      }));
    const toolEvents: ToolEvent[] = [];
    for (const m of r.messages) {
      if (m.role === 'tool_call' || m.role === 'tool_result') {
        const data = parseToolMessage(m.message) ?? {};
        toolEvents.push(toolEventFromPayload(data, m.role === 'tool_call' ? 'call' : 'result', m.agentName));
      }
    }
    return {
      roundId: r.id,
      roundNumber: r.roundNumber,
      turns,
      judgeAnalysis: r.judgeAnalysis,
      reachedConsensus: r.status === 'REACHED_CONSENSUS',
      finalConsensus: r.finalConsensus,
      toolEvents,
    };
  });
}

// ────────────────────────── Component ──────────────────────────

export default function GroupChatPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [currentGroup, setCurrentGroup] = useState<ChatGroupDetail | null>(null);
  const [history, setHistory] = useState<RoundTranscript[]>([]);
  const [liveRound, setLiveRound] = useState<LiveRound | null>(null);
  const [topic, setTopic] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{
    id: string;
    name: string;
    description: string | null;
    maxRounds: number;
    allowToolCalls: boolean;
    requireToolApproval: boolean;
    allowedToolIds: string[] | null;
    agents: { agentName: string; providerId: string; modelId: string | null; role: 'facilitator' | 'analyst' | 'critic' | 'advisor'; systemPrompt: string | null; position?: number }[];
  } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [expandedRounds, setExpandedRounds] = useState<Record<string, boolean>>({});
  const [pendingApprovals, setPendingApprovals] = useState<Record<string, ToolEvent>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track joined group room for cleanup.
  const joinedRef = useRef<string | null>(null);

  const reloadGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const data = await listGroups();
      setGroups(data.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list groups');
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const loadGroup = useCallback(async (groupId: string) => {
    setError(null);
    setLiveRound(null);
    setPendingApprovals({});
    try {
      const [g, h] = await Promise.all([getGroup(groupId), getGroupHistory(groupId)]);
      setCurrentGroup(g.group);
      const transcript: RoundTranscript[] = h.rounds.map(r => ({
        roundId: r.id,
        roundNumber: r.roundNumber,
        turns: r.messages.map(m => ({
          agentName: m.agentName,
          role: m.role,
          message: m.message,
          durationMs: 0,
        })),
        judgeAnalysis: r.judgeAnalysis,
        reachedConsensus: r.status === 'REACHED_CONSENSUS',
        finalConsensus: r.finalConsensus,
      }));
      setHistory(transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load group');
    }
  }, []);

  // Wire socket listeners for live round progress.
  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;
    if (!currentGroup) return;

    if (joinedRef.current && joinedRef.current !== currentGroup.id) {
      socket.emit('group:leave', joinedRef.current);
    }
    socket.emit('group:join', currentGroup.id);
    joinedRef.current = currentGroup.id;

    const onStart = (payload: {
      groupId: string;
      topic: string;
      agents: { name: string; role: string }[];
    }) => {
      if (payload.groupId !== currentGroup.id) return;
      setLiveRound({
        roundId: 'pending',
        roundNumber: 0,
        agents: payload.agents.map(a => ({
          agentName: a.name,
          role: a.role,
          message: '',
          status: 'thinking' as const,
        })),
        judgeAnalysis: null,
        reachedConsensus: null,
        finalConsensus: null,
        inProgress: true,
        toolEvents: [],
      });
    };

    const onRoundStart = (payload: {
      groupId: string;
      roundId: string;
      roundNumber: number;
    }) => {
      if (payload.groupId !== currentGroup.id) return;
      setLiveRound(prev =>
        prev
          ? {
              ...prev,
              roundId: payload.roundId,
              roundNumber: payload.roundNumber,
              agents: prev.agents.map(a => ({ ...a, status: 'thinking', message: '' })),
              judgeAnalysis: null,
              reachedConsensus: null,
              finalConsensus: null,
              inProgress: true,
              toolEvents: [],
            }
          : prev,
      );
    };

    const onAgentStart = (payload: {
      groupId: string;
      agentName: string;
      role: string;
    }) => {
      if (payload.groupId !== currentGroup.id) return;
      setLiveRound(prev => {
        if (!prev) return prev;
        const idx = prev.agents.findIndex(a => a.agentName === payload.agentName);
        if (idx < 0) return prev;
        const next = [...prev.agents];
        next[idx] = { ...next[idx], status: 'thinking', message: '' };
        return { ...prev, agents: next };
      });
    };

    const onAgentComplete = (payload: {
      groupId: string;
      agentName: string;
      role: string;
      message: string;
      error?: string | null;
    }) => {
      if (payload.groupId !== currentGroup.id) return;
      setLiveRound(prev => {
        if (!prev) return prev;
        const idx = prev.agents.findIndex(a => a.agentName === payload.agentName);
        if (idx < 0) return prev;
        const next = [...prev.agents];
        next[idx] = {
          ...next[idx],
          status: payload.error ? 'error' : 'done',
          message: payload.message,
          error: payload.error || null,
        };
        return { ...prev, agents: next };
      });
    };

    const onRoundComplete = (payload: {
      groupId: string;
      roundId: string;
      reachedConsensus: boolean;
      judgeAnalysis: string | null;
      finalConsensus: string | null;
    }) => {
      if (payload.groupId !== currentGroup.id) return;
      setLiveRound(prev =>
        prev
          ? {
              ...prev,
              judgeAnalysis: payload.judgeAnalysis,
              reachedConsensus: payload.reachedConsensus,
              finalConsensus: payload.finalConsensus,
              inProgress: false,
            }
          : prev,
      );
    };

    const onAllComplete = (payload: { groupId: string }) => {
      if (payload.groupId !== currentGroup.id) return;
      setLiveRound(null);
    };

    // ── Tool call events ──────────────────────────────────
    const onToolCall = (payload: {
      groupId: string;
      sessionId?: string | null;
      roundId?: string;
      agentName: string;
      name: string;
      args: Record<string, unknown>;
      invocationId?: string;
      status?: string;
      reason?: string;
      requiresApproval?: boolean;
    }) => {
      if (payload.groupId !== currentGroup.id) return;
      const event = toolEventFromPayload(payload, 'call', payload.agentName);

      // If pending approval, show approval UI.
      if (payload.status === 'pending-approval' && payload.invocationId) {
        setPendingApprovals(prev => ({
          ...prev,
          [payload.invocationId!]: event,
        }));
      }

      // Add to live round tool events.
      setLiveRound(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          toolEvents: [...prev.toolEvents, event],
        };
      });
    };

    const onToolResult = (payload: {
      groupId: string;
      agentName: string;
      name: string;
      invocationId?: string;
      ok?: boolean;
      error?: string;
      durationMs?: number;
      result?: unknown;
    }) => {
      if (payload.groupId !== currentGroup.id) return;
      const event = toolEventFromPayload(payload, 'result', payload.agentName);

      // If this resolved an approval, remove from pending.
      if (payload.invocationId) {
        setPendingApprovals(prev => {
          const next = { ...prev };
          delete next[payload.invocationId!];
          return next;
        });
      }

      setLiveRound(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          toolEvents: [...prev.toolEvents, event],
        };
      });
    };

    socket.on('group:consensus:start', onStart);
    socket.on('group:round:start', onRoundStart);
    socket.on('group:round:agent:start', onAgentStart);
    socket.on('group:round:agent:complete', onAgentComplete);
    socket.on('group:round:complete', onRoundComplete);
    socket.on('group:consensus:complete', onAllComplete);
    socket.on('group:round:agent:tool_call', onToolCall);
    socket.on('group:round:agent:tool_result', onToolResult);

    return () => {
      socket.off('group:consensus:start', onStart);
      socket.off('group:round:start', onRoundStart);
      socket.off('group:round:agent:start', onAgentStart);
      socket.off('group:round:agent:complete', onAgentComplete);
      socket.off('group:round:complete', onRoundComplete);
      socket.off('group:consensus:complete', onAllComplete);
      socket.off('group:round:agent:tool_call', onToolCall);
      socket.off('group:round:agent:tool_result', onToolResult);
    };
  }, [currentGroup]);

  useEffect(() => {
    return () => {
      const socket = initSocket();
      if (socket && joinedRef.current) socket.emit('group:leave', joinedRef.current);
    };
  }, []);

  useEffect(() => {
    reloadGroups();
    initSocket();
  }, [reloadGroups]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, liveRound, pendingApprovals]);

  const handleCreated = async (groupId: string) => {
    setShowCreate(false);
    await reloadGroups();
    await loadGroup(groupId);
  };

  const handleEdit = (group: ChatGroupDetail) => {
    setEditingGroup({
      id: group.id,
      name: group.name,
      description: group.description,
      maxRounds: group.maxRounds,
      allowToolCalls: group.allowToolCalls,
      requireToolApproval: group.requireToolApproval,
      allowedToolIds: group.allowedToolIds,
      agents: group.agents,
    });
    setShowCreate(true);
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Delete this panel and all its rounds?')) return;
    try {
      await deleteGroup(groupId);
      if (currentGroup?.id === groupId) {
        setCurrentGroup(null);
        setHistory([]);
      }
      await reloadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleRun = async () => {
    if (!currentGroup || !topic.trim() || running) return;
    setRunning(true);
    setError(null);
    setPendingApprovals({});
    try {
      // Start live round for streaming.
      setLiveRound({
        roundId: 'pending',
        roundNumber: 0,
        agents: (currentGroup.agents ?? []).map(a => ({
          agentName: a.agentName,
          role: a.role,
          message: '',
          status: 'thinking' as const,
        })),
        judgeAnalysis: null,
        reachedConsensus: null,
        finalConsensus: null,
        inProgress: true,
        toolEvents: [],
      });

      const result = await runConsensus(currentGroup.id, topic.trim());
      // Reload history once the run finishes.
      const h = await getGroupHistory(currentGroup.id);
      const transcript = transformRounds(h.rounds);
      setHistory(transcript);
      setLiveRound(null);
      setTopic('');
      if (result.status === 'FAILED' && !result.finalConsensus) {
        setError(`No consensus after ${result.totalRounds} rounds.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed');
      setLiveRound(null);
    } finally {
      setRunning(false);
    }
  };

  const handleApprove = useCallback(async (invocationId: string, event: ToolEvent) => {
    try {
      await approveInvocation(invocationId);
      setPendingApprovals(prev => {
        const next = { ...prev };
        delete next[invocationId];
        return next;
      });
      // Emit tool result via socket so orchestrator picks it up.
      const socket = initSocket();
      if (socket && currentGroup) {
        socket.emit('group:tool:approve', {
          groupId: currentGroup.id,
          invocationId,
          toolName: event.toolName,
          ok: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  }, [currentGroup]);

  const handleReject = useCallback(async (invocationId: string, event: ToolEvent) => {
    try {
      await rejectInvocation(invocationId);
      setPendingApprovals(prev => {
        const next = { ...prev };
        delete next[invocationId];
        return next;
      });
      const socket = initSocket();
      if (socket && currentGroup) {
        socket.emit('group:tool:reject', {
          groupId: currentGroup.id,
          invocationId,
          toolName: event.toolName,
          error: 'rejected',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejection failed');
    }
  }, [currentGroup]);

  const toggleExpand = (roundId: string) =>
    setExpandedRounds(prev => ({ ...prev, [roundId]: !prev[roundId] }));

  const sidebar = (
    <Box sx={{ width: DRAWER_WIDTH, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
        <GroupsIcon sx={{ mr: 1 }} />
        <Typography variant="h6" sx={{ flex: 1 }}>
          AI Panels
        </Typography>
        <Tooltip title="New panel">
          <IconButton onClick={() => setShowCreate(true)} size="small">
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {loadingGroups && <LinearProgress />}
        <List dense>
          {groups.map(g => (
            <ListItem
              key={g.id}
              disablePadding
              secondaryAction={
                <IconButton edge="end" size="small" onClick={() => handleDelete(g.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                selected={currentGroup?.id === g.id}
                onClick={() => loadGroup(g.id)}
              >
                <ListItemText
                  primary={g.name}
                  secondary={`${g.agentCount} advisors · ${g.roundCount} round${g.roundCount === 1 ? '' : 's'}`}
                  primaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        {!loadingGroups && groups.length === 0 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No panels yet. Create one to consult a team of AI advisors together.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  const liveOrCurrentAgents = useMemo(() => {
    return currentGroup?.agents || [];
  }, [currentGroup]);

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex' }}>
      {isMobile ? (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          {sidebar}
        </Drawer>
      ) : (
        <Box
          sx={{
            width: DRAWER_WIDTH,
            borderRight: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          {sidebar}
        </Box>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {isMobile && (
            <IconButton onClick={() => setDrawerOpen(true)} size="small">
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {currentGroup?.name || 'Select or create a panel'}
            </Typography>
            {currentGroup?.description && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {currentGroup.description}
              </Typography>
            )}
          </Box>
          {currentGroup && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Stack direction="row" spacing={0.5}>
                {liveOrCurrentAgents.map(a => (
                  <Tooltip key={a.id} title={`${a.agentName} · ${a.role}`}>
                    <Avatar
                      sx={{
                        bgcolor: colorFor(a.agentName),
                        width: 32,
                        height: 32,
                        fontSize: 13,
                      }}
                    >
                      {initialsFor(a.agentName)}
                    </Avatar>
                  </Tooltip>
                ))}
              </Stack>
              <Tooltip title="Edit panel">
                <IconButton size="small" onClick={() => handleEdit(currentGroup)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Box>

        {/* Body */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, backgroundColor: 'background.default' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Pending approvals banner */}
          {Object.keys(pendingApprovals).length > 0 && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {Object.entries(pendingApprovals).map(([invId, event]) => (
                <Card key={invId} variant="outlined" sx={{ borderLeft: 3, borderColor: 'warning.main' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Chip label="⏳ Tool Call Pending" color="warning" size="small" />
                      <Typography variant="subtitle2" color="text.primary">
                        {event.toolName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        by {event.agentName}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                      {JSON.stringify(event.args)}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="contained" color="success" onClick={() => handleApprove(invId, event)}>
                        Approve
                      </Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => handleReject(invId, event)}>
                        Reject
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {!currentGroup && !loadingGroups && (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
                color: 'text.secondary',
              }}
            >
              <GroupsIcon sx={{ fontSize: 64, opacity: 0.4 }} />
              <Typography>Create a panel to consult several AI advisors at once.</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreate(true)}
              >
                New panel
              </Button>
            </Box>
          )}

          {currentGroup && (
            <Stack spacing={2}>
              {history.map(round => (
                <RoundCard
                  key={round.roundId}
                  round={round}
                  expanded={expandedRounds[round.roundId] !== false}
                  onToggle={() => toggleExpand(round.roundId)}
                />
              ))}

              {liveRound && (
                <LiveRoundCard round={liveRound} onToolApprove={handleApprove} onToolReject={handleReject} />
              )}

              <div ref={messagesEndRef} />
            </Stack>
          )}
        </Box>

        {/* Composer */}
        {currentGroup && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder={`Ask the panel a question... (max ${currentGroup.maxRounds} rounds)`}
                value={topic}
                onChange={e => setTopic(e.target.value)}
                disabled={running}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleRun();
                  }
                }}
              />
              <Button
                variant="contained"
                endIcon={<SendIcon />}
                disabled={running || !topic.trim()}
                onClick={handleRun}
              >
                {running ? 'Discussing…' : 'Ask panel'}
              </Button>
            </Stack>
            {running && <LinearProgress sx={{ mt: 1 }} />}
          </Box>
        )}
      </Box>

      <CreateGroupDialog
        open={showCreate}
        onClose={() => { setEditingGroup(null); setShowCreate(false); }}
        onCreated={handleCreated}
        editData={editingGroup ?? undefined}
      />
    </Box>
  );
}

// ────────────────────────── Sub-components ──────────────────────────

function AgentMessage({
  agentName,
  role,
  message,
  thinking,
  error,
}: {
  agentName: string;
  role: string;
  message: string;
  thinking?: boolean;
  error?: string | null;
}) {
  const color = colorFor(agentName);
  return (
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      <Avatar sx={{ bgcolor: color, width: 36, height: 36, fontSize: 14 }}>
        {initialsFor(agentName)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2" sx={{ color, fontWeight: 600 }}>
            {agentName}
          </Typography>
          <Chip size="small" label={role} variant="outlined" sx={{ height: 18, fontSize: 11 }} />
          {thinking && (
            <Typography variant="caption" color="text.secondary">
              thinking…
            </Typography>
          )}
          {error && <ErrorIcon fontSize="small" color="error" />}
        </Stack>
        <Typography
          variant="body2"
          sx={{
            mt: 0.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: thinking ? 'text.secondary' : 'text.primary',
            fontStyle: thinking ? 'italic' : 'normal',
          }}
        >
          {thinking && !message ? '…' : message}
        </Typography>
      </Box>
    </Box>
  );
}

function ToolEventCard({
  event,
  onApprove,
  onReject,
}: {
  event: ToolEvent;
  onApprove?: (invocationId: string, event: ToolEvent) => void;
  onReject?: (invocationId: string, event: ToolEvent) => void;
}) {
  const color = colorFor(event.agentName);

  return (
    <Box sx={{ pl: 6, mt: 0.5, mb: 0.5 }}>
      <Card
        variant="outlined"
        sx={{
          borderLeft: 3,
          borderColor: event.kind === 'call' ? 'info.main' : event.ok === false ? 'error.main' : 'success.main',
          bgcolor: event.kind === 'call' ? 'info.50' : event.ok === false ? 'error.50' : 'success.50',
        }}
      >
        <CardContent sx={{ p: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ color, fontWeight: 600, fontSize: 13 }}>
              {event.agentName}
            </Typography>
            <Chip
              label={event.kind === 'call' ? '🔧 Tool Call' : event.ok === false ? '❌ Failed' : '✅ Success'}
              size="small"
              color={event.kind === 'call' ? 'info' : event.ok === false ? 'error' : 'success'}
            />
            <Typography variant="body2" fontWeight={600} fontSize={13}>
              {event.toolName}
            </Typography>
          </Stack>

          <Typography
            variant="caption"
            sx={{ fontFamily: 'monospace', fontSize: 11, display: 'block', mb: 0.5 }}
          >
            {JSON.stringify(event.args)}
          </Typography>

          {event.kind === 'result' && event.error && (
            <Typography variant="body2" color="error" fontSize={12}>
              Error: {event.error}
            </Typography>
          )}

          {event.kind === 'result' && event.ok && event.result ? (
            <Typography
              variant="body2"
              color="success.main"
              fontSize={12}
              sx={{ whiteSpace: 'pre-wrap' }}
            >
              {(event.result as React.ReactNode)}
            </Typography>
          ) : null}

          {event.kind === 'call' && event.invocationId && onApprove && onReject && (
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Button size="small" variant="contained" color="success" onClick={() => onApprove(event.invocationId!, event)}>
                Approve
              </Button>
              <Button size="small" variant="outlined" color="error" onClick={() => onReject(event.invocationId!, event)}>
                Reject
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

function RoundCard({
  round,
  expanded,
  onToggle,
}: {
  round: RoundTranscript;
  expanded: boolean;
  onToggle: () => void;
}) {
  const augmented = round as AugmentedRoundTranscript;
  const toolEvents = augmented.toolEvents ?? [];
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Chip
            size="small"
            label={`Round ${round.roundNumber}`}
            color={round.reachedConsensus ? 'success' : 'default'}
          />
          {round.reachedConsensus && (
            <Chip
              size="small"
              icon={<CheckCircleIcon />}
              color="success"
              label="Consensus"
            />
          )}
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={onToggle}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Stack>

        {round.finalConsensus && (
          <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Final consensus</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {round.finalConsensus}
            </Typography>
          </Alert>
        )}

        <Collapse in={expanded}>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {toolEvents.map((te, i) => (
              <ToolEventCard key={`tool-${i}`} event={te} />
            ))}
            {round.turns.map((t, i) => (
              <AgentMessage
                key={`${round.roundId}-${i}`}
                agentName={t.agentName}
                role={t.role}
                message={t.message}
                error={t.error}
              />
            ))}
            {round.judgeAnalysis && (
              <Box sx={{ pl: 6 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Judge: {round.judgeAnalysis}
                </Typography>
              </Box>
            )}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

function LiveRoundCard({
  round,
  onToolApprove,
  onToolReject,
}: {
  round: LiveRound;
  onToolApprove?: (invocationId: string, event: ToolEvent) => void;
  onToolReject?: (invocationId: string, event: ToolEvent) => void;
}) {
  return (
    <Card variant="outlined" sx={{ borderColor: 'primary.main', borderWidth: 1 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Chip
            size="small"
            label={round.roundNumber > 0 ? `Round ${round.roundNumber} (live)` : 'Starting…'}
            color="primary"
          />
          {round.inProgress && <LinearProgress sx={{ flex: 1 }} />}
        </Stack>

        <Stack spacing={1}>
          {round.toolEvents.map((te, i) => (
            <ToolEventCard
              key={`live-tool-${i}`}
              event={te}
              onApprove={onToolApprove}
              onReject={onToolReject}
            />
          ))}
          {round.agents.map(a => (
            <AgentMessage
              key={a.agentName}
              agentName={a.agentName}
              role={a.role}
              message={a.message}
              thinking={a.status === 'thinking'}
              error={a.error}
            />
          ))}
        </Stack>

        {round.judgeAnalysis && (
          <Box sx={{ pl: 6, mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Judge: {round.judgeAnalysis}
            </Typography>
          </Box>
        )}

        {round.finalConsensus && (
          <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mt: 1.5 }}>
            <Typography variant="subtitle2">Consensus reached</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {round.finalConsensus}
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
