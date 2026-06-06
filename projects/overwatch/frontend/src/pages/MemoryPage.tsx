import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Stack,
  TextField,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  StarRate,
  StarOutline,
  Refresh as RefreshIcon,
  UploadFile as UploadIcon,
} from '@mui/icons-material';
import {
  Memory,
  MemoryCategory,
  MEMORY_CATEGORIES,
  listMemories,
  listCategories,
  createMemory,
  updateMemory,
  deleteMemory,
  promoteMemory,
  searchMemories,
  rebuildMemoryIndex,
  importMemories,
  SearchHit,
} from '../api/memory';

interface FormState {
  category: MemoryCategory;
  content: string;
  isPromoted: boolean;
  ttlDays: string;
}

const blankForm: FormState = { category: 'LONG_TERM', content: '', isPromoted: false, ttlDays: '' };

export default function MemoryPage() {
  const [tab, setTab] = useState<'browse' | 'search'>('browse');
  const [items, setItems] = useState<Memory[]>([]);
  const [categories, setCategories] = useState<Array<{ category: MemoryCategory; count: number }>>([]);
  const [filter, setFilter] = useState<MemoryCategory | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, cats] = await Promise.all([
        listMemories({ category: filter || undefined, pageSize: 100 }),
        listCategories(),
      ]);
      setItems(list.items);
      setCategories(cats.categories);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setEditOpen(true);
  };

  const openEdit = (m: Memory) => {
    setEditing(m);
    setForm({
      category: m.category,
      content: m.content,
      isPromoted: m.isPromoted,
      ttlDays: m.ttlDays != null ? String(m.ttlDays) : '',
    });
    setEditOpen(true);
  };

  const submitForm = async () => {
    try {
      const payload = {
        category: form.category,
        content: form.content,
        isPromoted: form.isPromoted,
        ttlDays: form.ttlDays ? Number(form.ttlDays) : null,
      };
      if (editing) {
        await updateMemory(editing.id, payload);
      } else {
        await createMemory(payload);
      }
      setEditOpen(false);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (m: Memory) => {
    if (!confirm(`Delete memory "${m.content.slice(0, 40)}..."?`)) return;
    try {
      await deleteMemory(m.id);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handlePromote = async (m: Memory) => {
    try {
      await promoteMemory(m.id, !m.isPromoted);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const r = await searchMemories({ query: searchQuery, topK: 10 });
      setSearchHits(r.hits);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const handleRebuild = async () => {
    setLoading(true);
    try {
      const r = await rebuildMemoryIndex();
      alert(`Rebuilt ${r.rebuilt} memory embeddings`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const lines = importText.split('\n').map((l) => l.trim()).filter(Boolean);
      const itemsToImport = lines.map((content) => ({
        category: 'LONG_TERM' as MemoryCategory,
        content,
      }));
      if (!itemsToImport.length) return;
      const r = await importMemories(itemsToImport);
      alert(`Imported ${r.created} memories`);
      setImportText('');
      setImportOpen(false);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Memory (RAG)</Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Rebuild TF-IDF index">
            <Button startIcon={<RefreshIcon />} onClick={handleRebuild} disabled={loading}>
              Rebuild Index
            </Button>
          </Tooltip>
          <Button startIcon={<UploadIcon />} onClick={() => setImportOpen(true)}>
            Import
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Memory
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="browse" label="Browse" />
        <Tab value="search" label="Search" />
      </Tabs>

      {tab === 'browse' && (
        <>
          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
            <Chip
              label={`All (${categories.reduce((a, c) => a + c.count, 0)})`}
              color={filter === '' ? 'primary' : 'default'}
              onClick={() => setFilter('')}
            />
            {MEMORY_CATEGORIES.map((c) => {
              const count = categories.find((x) => x.category === c)?.count ?? 0;
              return (
                <Chip
                  key={c}
                  label={`${c} (${count})`}
                  color={filter === c ? 'primary' : 'default'}
                  onClick={() => setFilter(c)}
                />
              );
            })}
          </Stack>

          {loading ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
          ) : items.length === 0 ? (
            <Alert severity="info">No memories yet. Click "Add Memory" to create one.</Alert>
          ) : (
            <Stack spacing={1}>
              {items.map((m) => (
                <Card key={m.id}>
                  <CardContent sx={{ pb: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <Chip size="small" label={m.category} />
                      {m.isPromoted && <Chip size="small" color="warning" icon={<StarRate />} label="promoted" />}
                      <Typography variant="caption" color="text.secondary">
                        Updated {new Date(m.updatedAt).toLocaleString()} • accessed {m.accessCount}x
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.content}</Typography>
                  </CardContent>
                  <CardActions>
                    <IconButton size="small" onClick={() => handlePromote(m)}>
                      {m.isPromoted ? <StarRate color="warning" /> : <StarOutline />}
                    </IconButton>
                    <IconButton size="small" onClick={() => openEdit(m)} disabled={!m.isEditable}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(m)}>
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              ))}
            </Stack>
          )}
        </>
      )}

      {tab === 'search' && (
        <>
          <Stack direction="row" spacing={1} mb={2}>
            <TextField
              fullWidth
              placeholder="Search memory (semantic + keyword hybrid)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void runSearch(); }}
            />
            <Button variant="contained" startIcon={<SearchIcon />} onClick={runSearch} disabled={searching}>
              Search
            </Button>
          </Stack>
          {searching ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
          ) : searchHits.length === 0 ? (
            <Alert severity="info">{searchQuery ? 'No results' : 'Enter a query above.'}</Alert>
          ) : (
            <Stack spacing={1}>
              {searchHits.map((h, idx) => (
                <Card key={h.memory.id}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <Chip size="small" label={`#${idx + 1}`} />
                      <Chip size="small" label={h.memory.category} />
                      <Chip size="small" color="primary" label={`score ${h.score.toFixed(3)}`} />
                      {h.semanticScore !== undefined && <Chip size="small" variant="outlined" label={`semantic ${h.semanticScore.toFixed(3)}`} />}
                      {h.ftsScore !== undefined && h.ftsScore > 0 && <Chip size="small" variant="outlined" label={`fts ${h.ftsScore.toFixed(3)}`} />}
                      {h.memory.isPromoted && <Chip size="small" color="warning" icon={<StarRate />} label="promoted" />}
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{h.memory.content}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </>
      )}

      {/* Edit / Create dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Memory' : 'Add Memory'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as MemoryCategory })}
            >
              {MEMORY_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Content"
              multiline
              minRows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <FormControlLabel
              control={<Switch checked={form.isPromoted} onChange={(e) => setForm({ ...form, isPromoted: e.target.checked })} />}
              label="Promoted (always preferred in RAG)"
            />
            <TextField
              label="TTL (days, optional)"
              type="number"
              value={form.ttlDays}
              onChange={(e) => setForm({ ...form, ttlDays: e.target.value })}
              helperText="Leave blank for no expiration"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitForm} disabled={!form.content.trim()}>
            {editing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Memories</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={1}>
            One memory per line. All imported as LONG_TERM category.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={10}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="User prefers dark mode\nUser is based in UTC\n..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleImport} disabled={!importText.trim()}>Import</Button>
        </DialogActions>
      </Dialog>

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="text.secondary">
        Memories are automatically injected into agent chats based on semantic relevance to your message.
      </Typography>
    </Box>
  );
}
