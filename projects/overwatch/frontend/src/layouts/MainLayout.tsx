import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Collapse,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Groups as GroupsIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Dashboard as DashboardIcon,
  Dns as ProvidersIcon,
  ModelTraining as ModelsIcon,
  Computer as SystemsIcon,
  Memory as HardwareIcon,
  Speed as BenchmarkIcon,
  Build as ToolsIcon,
  Lock as ToolPermissionsIcon,
  AltRoute as RoutingIcon,
  Psychology as MemoryRagIcon,
  AutoFixHigh as ImprovementIcon,
  SmartDisplay as AdvisorsIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../services/api';
import NotificationBell from '../components/NotificationBell';

const DRAWER_WIDTH = 260;

const topNavItems = [
  { path: '/chat', label: 'Chat', icon: <ChatIcon /> },
  { path: '/panels', label: 'AI Panels', icon: <GroupsIcon /> },
];

const systemSettingsItems = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/providers', label: 'Providers', icon: <ProvidersIcon /> },
  { path: '/models', label: 'Models', icon: <ModelsIcon /> },
  { path: '/systems', label: 'Systems', icon: <SystemsIcon /> },
  { path: '/hardware', label: 'Hardware', icon: <HardwareIcon /> },
  { path: '/benchmark', label: 'Benchmark', icon: <BenchmarkIcon /> },
  { path: '/tools', label: 'Tools', icon: <ToolsIcon /> },
  { path: '/tool-permissions', label: 'Tool Permissions', icon: <ToolPermissionsIcon /> },
  { path: '/routing', label: 'Routing', icon: <RoutingIcon /> },
  { path: '/memory', label: 'Memory (RAG)', icon: <MemoryRagIcon /> },
  { path: '/improvement', label: 'Self-Improvement', icon: <ImprovementIcon /> },
  { path: '/advisors', label: 'Advisors', icon: <AdvisorsIcon /> },
  { path: '/settings', label: 'Settings', icon: <SettingsIcon /> },
];

const adminItems = [
  { path: '/admin', label: 'Admin', icon: <AdminIcon /> },
];

export default function MainLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [systemExpanded, setSystemExpanded] = useState(true);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const isSystemActive = systemSettingsItems.some(
    item => location.pathname === item.path
  );

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" fontWeight={700} noWrap>
          OVERWATCH
        </Typography>
      </Toolbar>

      <Divider />

      {/* Navigation */}
      <List sx={{ flex: 1 }}>
        {/* Top-level nav items (Chat only) */}
        {topNavItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                '&.Mui-selected': {
                  borderRight: '3px solid',
                  borderColor: 'primary.main',
                  bgcolor: 'rgba(0, 188, 212, 0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}

        {/* System Settings submenu */}
        <ListItem disablePadding sx={{ px: 1, mt: 1 }}>
          <ListItemButton
            onClick={() => setSystemExpanded(!systemExpanded)}
            sx={{
              '&.Mui-selected': {
                bgcolor: 'transparent',
              },
            }}
          >
            <ListItemIcon>
              <SettingsIcon sx={{ color: isSystemActive ? 'primary.main' : 'inherit' }} />
            </ListItemIcon>
            <ListItemText
              primary="System Settings"
              primaryTypographyProps={{ fontWeight: isSystemActive ? 600 : 400 }}
            />
            {systemExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
        </ListItem>
        <Collapse in={systemExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {systemSettingsItems.map((item) => (
              <ListItem key={item.path} disablePadding sx={{ pl: 4 }}>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  sx={{
                    '&.Mui-selected': {
                      borderRight: '3px solid',
                      borderColor: 'primary.main',
                      bgcolor: 'rgba(0, 188, 212, 0.08)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit', minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>

        {/* Admin section (ADMIN role only) */}
        {user?.role === 'ADMIN' && (
          <>
            <Divider sx={{ my: 1 }} />
            {adminItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  sx={{
                    '&.Mui-selected': {
                      borderRight: '3px solid',
                      borderColor: 'primary.main',
                      bgcolor: 'rgba(0, 188, 212, 0.08)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </>
        )}
      </List>

      {/* User info at bottom */}
      <Divider />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            {user?.displayName.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {user?.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.role}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {topNavItems.find((item) => item.path === location.pathname)?.label ||
             systemSettingsItems.find((item) => item.path === location.pathname)?.label ||
             adminItems.find((item) => item.path === location.pathname)?.label ||
             'Overwatch'}
          </Typography>

          {/* Notifications */}
          <NotificationBell />

          {/* Profile Menu */}
          <IconButton onClick={handleProfileMenuOpen} sx={{ ml: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {user?.displayName.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <PersonIcon sx={{ mr: 1 }} />
              {user?.email}
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px',
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
          bgcolor: 'background.default',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
