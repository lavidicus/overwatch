import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemText,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Chip, useTheme, useMediaQuery,
  Drawer,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { listSessions, createSession, getSession, deleteSession, sendMessageStreaming, ChatMessage } from '../api/chat';
import { useChatEvents, initSocket, leaveChatSession } from '../hooks/useSocket';
import ChatInput from '../components/ChatInput';
import MessageBubble from '../components/MessageBubble';
import ProviderConfigDialog from '../components/ProviderConfig';

export default function ChatPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showProviderConfig, setShowProviderConfig] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Socket events
  const onMessageDelta = useCallback((delta: string) => {
    setStreamContent(prev => prev + delta);
  }, []);

  const onMessageComplete = useCallback((content: string) => {
    setStreaming(false);
    setMessages(prev => [...prev, {
      id: `generated-${Date.now()}`,
      role: 'assistant',
      content,
      modelUsed: currentSession?.model || null,
      createdAt: new Date().toISOString(),
    }]);
    setStreamContent('');
    // Refresh session count
    loadSessions();
  }, [currentSession]);

  const onError = useCallback((error: string) => {
    setStreaming(false);
    setStreamContent('');
    setError(error);
  }, []);

  const onTyping = useCallback(() => {
    // Could show typing indicator
  }, []);

  useChatEvents(currentSession?.id || null, onMessageDelta, onMessageComplete, onError, onTyping);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await listSessions(1, 50);
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
    initSocket();
    return () => {
      if (currentSession?.id) leaveChatSession(currentSession.id);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  const selectSession = async (sessionId: string) => {
    if (currentSession?.id) leaveChatSession(currentSession.id);

    setCurrentSession(null);
    setMessages([]);
    setStreamContent('');
    setError(null);
    setStreaming(false);

    try {
      const data = await getSession(sessionId);
      setCurrentSession(data);
      setMessages(data.messages || []);
      if (data.messages && data.messages.length > 0) {
        initSocket()?.emit('chat:join', sessionId);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load session');
    }
  };

  const createNewSession = async () => {
    setShowNewSessionDialog(false);
    setShowProviderConfig(true);
  };

  const handleProviderSelect = async (providerId: string, model: string) => {
    setShowProviderConfig(false);
    try {
      const data = await createSession({
        title: newSessionTitle || undefined,
        providerId,
        model,
      });
      setSessions(prev => [data, ...prev]);
      selectSession(data.id);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create session');
    }
  };

  const handleSend = async (content: string) => {
    if (!currentSession || streaming) return;

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      modelUsed: currentSession.model,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    setError(null);
    setStreamContent('');

    try {
      abortRef.current = sendMessageStreaming(
        currentSession.id,
        content,
        onMessageDelta,
        onMessageComplete,
        onError
      );
    } catch (err) {
      setStreaming(false);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
        setStreamContent('');
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: '#0a0a0f' }}>
      {/* Mobile drawer toggle */}
      {isMobile && (
        <IconButton
          onClick={() => setDrawerOpen(!drawerOpen)}
          sx={{ position: 'fixed', top: 8, left: 8, zIndex: 1100, bgcolor: 'background.paper' }}
        >
          {drawerOpen ? <CloseIcon /> : <MenuIcon />}
        </IconButton>
      )}

      {/* Sidebar / Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? drawerOpen : true}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerOpen ? 280 : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            bgcolor: '#0d1117',
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" color="primary">Chats</Typography>
          <IconButton onClick={createNewSession} color="primary">
            <AddIcon />
          </IconButton>
        </Box>

        <List sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
          {loadingSessions ? (
            <ListItem><Typography>Loading...</Typography></ListItem>
          ) : sessions.length === 0 ? (
            <ListItem><Typography color="text.secondary" sx={{ px: 2 }}>No chats yet</Typography></ListItem>
          ) : (
            sessions.map(session => (
              <ListItem key={session.id} disablePadding secondaryAction={
                <IconButton size="small" onClick={(e) => handleDeleteSession(session.id, e)}>
                  <DeleteIcon fontSize="small" color="error" />
                </IconButton>
              }>
                <ListItemButton
                  selected={currentSession?.id === session.id}
                  onClick={() => selectSession(session.id)}
                  sx={{
                    borderRadius: 1,
                    mx: 1,
                    mb: 0.5,
                    bgcolor: currentSession?.id === session.id ? 'primary.main' : 'transparent',
                    color: currentSession?.id === session.id ? 'primary.contrastText' : 'text.primary',
                    '&:hover': {
                      bgcolor: currentSession?.id === session.id ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={session.title || 'New Chat'}
                    secondary={`${session.messageCount} messages · ${new Date(session.updatedAt).toLocaleDateString()}`}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Drawer>

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {currentSession ? (
          <>
            {/* Header */}
            <Box sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: '#0d1117',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}>
              <Typography variant="h6" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentSession.title || 'Chat'}
              </Typography>
              {currentSession.providerName && (
                <Chip label={currentSession.providerName} size="small" color="info" />
              )}
              {currentSession.model && (
                <Chip label={currentSession.model} size="small" variant="outlined" />
              )}
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflow: 'auto', py: 2 }}>
              {messages.length === 0 && !streaming && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 2 }}>
                  <Typography color="text.secondary" variant="h5">Start a conversation</Typography>
                  <Typography color="text.secondary" variant="body2">Select a provider and start chatting</Typography>
                </Box>
              )}

              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.createdAt}
                />
              ))}

              {streaming && streamContent && (
                <MessageBubble role="assistant" content={streamContent} streaming />
              )}

              {streaming && !streamContent && (
                <MessageBubble role="assistant" content="..." streaming />
              )}

              <div ref={messagesEndRef} />
            </Box>

            {/* Error Banner */}
            {error && (
              <Box sx={{ px: 2, py: 1, bgcolor: 'error.main', color: 'error.contrastText' }}>
                <Typography variant="body2">{error}</Typography>
              </Box>
            )}

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              disabled={streaming}
              placeholder="Type a message..."
            />
          </>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h4" color="primary">Overwatch Chat</Typography>
            <Typography color="text.secondary">Select a chat or create a new one</Typography>
            <Button variant="contained" onClick={createNewSession} startIcon={<AddIcon />}>
              New Chat
            </Button>
          </Box>
        )}
      </Box>

      {/* New Session Dialog */}
      <Dialog open={showNewSessionDialog} onClose={() => setShowNewSessionDialog(false)}>
        <DialogTitle>New Chat</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Session Title (optional)"
            value={newSessionTitle}
            onChange={e => setNewSessionTitle(e.target.value)}
            placeholder="My conversation..."
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewSessionDialog(false)}>Cancel</Button>
          <Button onClick={createNewSession} variant="contained">Continue</Button>
        </DialogActions>
      </Dialog>

      {/* Provider Config Dialog */}
      <ProviderConfigDialog
        open={showProviderConfig}
        onClose={() => setShowProviderConfig(false)}
        onSelect={handleProviderSelect}
        initialProviderId={currentSession?.providerId}
        initialModel={currentSession?.model || undefined}
      />
    </Box>
  );
}
