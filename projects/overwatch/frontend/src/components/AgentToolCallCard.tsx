import { Box, Chip, Typography, Paper } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import type { AgentToolCall } from '../api/chat';

interface AgentToolCallCardProps {
  call: AgentToolCall;
  pending?: boolean;
}

/**
 * Compact inline card showing one tool call made during an agent turn.
 * Used inside ChatPage to render the agent loop's tool invocations.
 */
export default function AgentToolCallCard({ call, pending }: AgentToolCallCardProps) {
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
    </Paper>
  );
}
