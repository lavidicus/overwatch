import { Paper, Box, Typography, IconButton } from '@mui/material';
import { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface MessageBubbleProps {
  role: string;
  content: string;
  timestamp?: string;
  streaming?: boolean;
}

export default function MessageBubble({ role, content, timestamp, streaming = false }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple line break rendering (no markdown for MVP — can add react-markdown later)
  const renderContent = () => {
    const lines = content.split('\n');
    return lines.map((line, i) => (
      <Box key={i}>
        {line}
        {i < lines.length - 1 && <br />}
      </Box>
    ));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 2,
        padding: '0 16px',
      }}
    >
      <Paper
        elevation={1}
        sx={{
          maxWidth: '80%',
          padding: 2,
          borderRadius: 3,
          bgcolor: isUser ? 'primary.main' : 'grey.900',
          color: isUser ? 'primary.contrastText' : 'grey.200',
          borderTopLeftRadius: isUser ? 4 : 0,
          borderTopRightRadius: isUser ? 0 : 4,
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {renderContent()}
          {streaming && <Box component="span" sx={{ display: 'inline-block', width: 8, height: 16, bgcolor: 'currentColor', animation: 'blink 1s infinite' }} />}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            {isUser ? 'You' : 'AI'}{timestamp ? ` · ${new Date(timestamp).toLocaleTimeString()}` : ''}
          </Typography>
          {!isUser && (
            <IconButton size="small" onClick={handleCopy} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
              {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
