import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { listToolGrants, revokeToolGrant, UserToolGrant } from '../api/tools';

/**
 * Per-user view of "always allow" / "allow for this chat" tool grants.
 * Lets the current user see and revoke any grant they previously created.
 */
export default function ToolPermissionsPage() {
  const [grants, setGrants] = useState<UserToolGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listToolGrants();
      setGrants(r.grants);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tool grants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await revokeToolGrant(id);
      setGrants((prev) => prev.filter((g) => g.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>Tool Permissions</Typography>
        <Typography variant="body2" color="text.secondary">
          Tools you have pre-authorized for your account. When the agent calls one of these
          tools the approval prompt is skipped automatically. Revoke any grant you no longer
          want.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      <Paper variant="outlined">
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : grants.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <LockOpenIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" color="text.secondary">No tool grants yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              When you click <em>"Always allow this tool"</em> or <em>"Allow for this chat only"</em>
              {' '}on an agent tool-call card, the grant will show up here.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tool</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Session</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grants.map((g) => (
                <TableRow key={g.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                      {g.tool?.name ?? g.toolId}
                    </Typography>
                    {g.tool?.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {g.tool.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {g.tool?.category && (
                      <Chip size="small" label={g.tool.category} variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={g.scope === 'ALL' ? 'All sessions' : 'Single session'}
                      color={g.scope === 'ALL' ? 'success' : 'info'}
                    />
                  </TableCell>
                  <TableCell>
                    {g.sessionId ? (
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {g.sessionId.slice(0, 8)}…
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(g.createdAt).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteOutlineIcon />}
                      disabled={revoking === g.id}
                      onClick={() => handleRevoke(g.id)}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
