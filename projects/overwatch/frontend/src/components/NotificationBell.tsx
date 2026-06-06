import React, { useEffect } from 'react';
import { Box, IconButton, Badge, Menu, List, ListItem, ListItemText, Typography, Avatar, Divider, Button } from '@mui/material';
import { Notifications as NotificationsIcon, ClearAll as ClearAllIcon } from '@mui/icons-material';
import { useSocket, Notification as SocketNotification } from '../hooks/useSocket';
import { useNotificationStore } from '../stores/notificationStore';

interface ExtendedNotification extends SocketNotification {
  read?: boolean;
}

interface NotificationBellProps {
  onNotificationClick?: (notification: SocketNotification) => void;
}

export default function NotificationBell({ onNotificationClick }: NotificationBellProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const notifications = useNotificationStore((state) => state.notifications) as ExtendedNotification[];
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);

  const handleNotification = (notification: SocketNotification) => {
    addNotification(notification);
    onNotificationClick?.(notification);
  };

  const { subscribeToNotifications, unsubscribeFromNotifications, connected } = useSocket({
    autoConnect: false,
    onNotification: handleNotification,
    onError: (error) => console.error('Socket error:', error),
  });

  useEffect(() => {
    if (connected && subscribeToNotifications) {
      subscribeToNotifications(handleNotification);
      return () => {
        if (unsubscribeFromNotifications) {
          unsubscribeFromNotifications(handleNotification);
        }
      };
    }
  }, [subscribeToNotifications, unsubscribeFromNotifications, connected]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleClearAll = () => {
    clearNotifications();
    handleMenuClose();
  };

  const getNotificationColor = (type: SocketNotification['type']) => {
    switch (type) {
      case 'success':
        return '#4caf50';
      case 'warning':
        return '#ff9800';
      case 'error':
        return '#f44336';
      default:
        return '#2196f3';
    }
  };

  const getNotificationIcon = (type: SocketNotification['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <>
      <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { width: 400, maxHeight: 500 },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
          {notifications.length > 0 && (
            <Button size="small" color="inherit" onClick={handleClearAll} startIcon={<ClearAllIcon />}>
              Clear All
            </Button>
          )}
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">No notifications</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.slice(0, 10).map((notification, index) => (
              <React.Fragment key={notification.timestamp}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    bgcolor: notification.read ? 'transparent' : 'rgba(0, 188, 212, 0.04)',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: getNotificationColor(notification.type),
                      width: 32,
                      height: 32,
                      mr: 2,
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={notification.read ? 400 : 600}>
                        {notification.title || notification.message}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" display="block">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {notification.timestamp ? new Date(notification.timestamp).toLocaleString() : ''}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {index < Math.min(notifications.length - 1, 9) && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
}
