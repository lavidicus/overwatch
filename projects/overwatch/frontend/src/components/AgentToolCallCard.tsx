import { useState } from 'react';
import { Box, Chip, Typography, Paper, Button, Stack, CircularProgress } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import type { AgentToolCall } from '../api/chat';
import { approveInvocation, rejectInvocation } from '../api/tools';

interface AgentToolCallCardProps {
  call: AgentToolCall;
  pending?: boolean;
  /** Invocation id for pending calls — enables inline approval buttons. */
  invocationId?: string;
  /** Called after an approval or rejection completes so the parent can refresh. */
  onResolved?: (kind: 'approved' | 'approved-grant-all' | 'approved-grant-session' | 'rejected') => void;
}

/**
 * Compact inline card showing one tool call made during an agent turn.
 * Used inside ChatPage to render the agent loop's tool invocations.
 *
 * When the call is pending approval and we have its invocation id, we render
 * three approval actions:
 *   - Approve once (existing behavior)
 *   - Always allow this tool (creates a UserToolGrant with scope=ALL)
 *   - Allow for this chat only (creates a UserToolGrant with scope=SESSION)
 */
export default function AgentToolCallCard({ call, pending, invocationId, onResolved }: AgentToolCallCardProps) {
  const [busy, setBusy] = useState<null | 'once' | 'always' | 'session' | 'reject'>(null);
  const [err, setErr] = useState<string | null>(null);

  const status = pending
    ? { color: 'warning' as const, label: 'approval required', icon: <HourglassEmptyIcon fontSize="small" /> }
    : call.ok
      ? { color: 'success' as const, label: 'ok', icon: <CheckCircleIcon fontSize="small" /> }
      : { color: 'error' as const, label: 'failed', icon: <ErrorIcon fontSize="small" /> };

  let argsPreview = '';
  try {
    argsPreview = JSON.stringify(call.args ?? {}, null, 0);
    if (argsPreview.length > 240) argsPreview = argsPreview.slice(0, 240) + '…';
  } catch {
    argsPreview = String(call.args);
  }

  const handleApprove = async (kind: 'once' | 'always' | 'session') => {
    if (!invocationId) return;
    setBusy(kind);
    setErr(null);
    try {
      if (kind === 'once') {
        await approveInvocation(invocationId);
        onResolved?.('approved');
      } else if (kind === 'always') {
        await approveInvocation(invocationId, { createGrant: true, scope: 'ALL' });
        onResolved?.('approved-grant-all');
      } else {
        await approveInvocation(invocationId, { createGrant: true, scope: 'SESSION' });
        onResolved?.('approved-grant-session');
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    if (!invocationId) return;
    setBusy('reject');
    setErr(null);
    try {
      await rejectInvocation(invocationId);
      onResolved?.('rejected');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        my: 1,
        mx: 1,
        px: 1.5,
        py: 1,
        bgcolor: '#0d1117',
        borderColor: 'divider',
        borderLeft: 3,
        borderLeftColor: `${status.color}.main`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <BuildIcon fontSize="small" color="primary" />
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
          {call.name}
        </Typography>
        <Chip
          size="small"
          color={status.color}
          icon={status.icon}
          label={status.label}
          sx={{ fontSize: '0.7rem', height: 20 }}
        />
      </Box>
      {argsPreview && argsPreview !== '{}' && (
        <Typography
          variant="caption"
          component="pre"
          sx={{
            m: 0,
            color: 'text.secondary',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontFamily: 'monospace',
            fontSize: '0.72rem',
          }}
        >
          {argsPreview}
        </Typography>
      )}
      {call.error && (
        <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
          {call.error}
        </Typography>
      )}

      {pending && invocationId && (
        <Box sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={busy !== null}
              onClick={() => handleApprove('once')}
              startIcon={busy === 'once' ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              Approve once
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="success"
              disabled={busy !== null}
              onClick={() => handleApprove('always')}
              startIcon={busy === 'always' ? <CircularProgress size={14} color="inherit" /> : undefined}
              title="Always allow this tool for any future chat"
            >
              Always allow this tool
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="info"
              disabled={busy !== null}
              onClick={() => handleApprove('session')}
              startIcon={busy === 'session' ? <CircularProgress size={14} color="inherit" /> : undefined}
              title="Always allow this tool inside the current chat session only"
            >
              Allow for this chat only
            </Button>
            <Button
              size="small"
              variant="text"
              color="error"
              disabled={busy !== null}
              onClick={handleReject}
              startIcon={busy === 'reject' ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              Reject
            </Button>
          </Stack>
          {err && (
            <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
              {err}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}
