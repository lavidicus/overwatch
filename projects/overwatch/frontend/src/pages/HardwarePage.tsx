import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Memory as HardwareIcon,
  Refresh as RefreshIcon,
  Psychology as AIIcon,
} from '@mui/icons-material';
import { whatllmApi } from '../services/api';

interface SystemWithHardware {
  id: string;
  name: string;
  hostname: string;
  protocol: string;
  hardwareInfo?: {
    cpuModel?: string;
    cpuCores?: number;
    cpuThreads?: number;
    ramGB?: number;
    gpuInfo?: Array<{ name: string; vramGB: number }>;
    os?: string;
    kernel?: string;
    dockerVersion?: string;
    whatllmRecs?: any[];
    analyzedAt?: string;
  };
}

export default function HardwarePage() {
  const [systems, setSystems] = useState<SystemWithHardware[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadHardwareAnalysis();
  }, []);

  const loadHardwareAnalysis = async () => {
    try {
      setLoading(true);
      const response = await whatllmApi.listSystems();
      setSystems(response.data.systems || []);
    } catch (error) {
      console.error('Failed to load hardware analysis:', error);
      setAlert({ type: 'error', message: 'Failed to load hardware analysis' });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (systemId: string) => {
    try {
      setAnalyzingId(systemId);
      setAlert({ type: 'success', message: 'Running WhichLLM analysis...' });
      
      const response = await whatllmApi.analyze(systemId);
      
      setAlert({
        type: 'success',
        message: `Analysis complete! Found ${response.data.recommendations?.length || 0} model recommendations`,
      });

      loadHardwareAnalysis();
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.error || 'Analysis failed',
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  const getGPUSummary = (gpuInfo?: any[]) => {
    if (!gpuInfo || gpuInfo.length === 0) return 'No GPU detected';
    
    const totalVram = gpuInfo.reduce((sum, gpu) => sum + (gpu.vramGB || 0), 0);
    const names = [...new Set(gpuInfo.map((g) => g.name))];
    
    return `${gpuInfo.length}x ${names.join(', ')} (${totalVram}GB VRAM total)`;
  };

  const getTotalVRAM = (gpuInfo?: any[]) => {
    if (!gpuInfo) return 0;
    return gpuInfo.reduce((sum, gpu) => sum + (gpu.vramGB || 0), 0);
  };

  const getModelRecommendation = (recs?: any[]) => {
    if (!recs || recs.length === 0) return null;
    
    // Find best GPU recommendation
    const gpuRec = recs.find((r) => r.type === 'GPU');
    if (gpuRec && gpuRec.models && gpuRec.models.length > 0) {
      return gpuRec.models[0];
    }
    
    // Fallback to CPU recommendation
    const cpuRec = recs.find((r) => r.type === 'CPU');
    if (cpuRec && cpuRec.models && cpuRec.models.length > 0) {
      return cpuRec.models[0];
    }
    
    return null;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HardwareIcon fontSize="large" color="primary" />
          <Typography variant="h4" fontWeight={700}>
            Hardware Analysis
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadHardwareAnalysis}
        >
          Refresh
        </Button>
      </Box>

      {/* Alert */}
      {alert && (
        <Alert severity={alert.type} onClose={() => setAlert(null)} sx={{ mb: 3 }}>
          {alert.message}
        </Alert>
      )}

      {/* Systems with Hardware Info */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : systems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <HardwareIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No systems analyzed
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add systems and run WhichLLM analysis to see hardware recommendations
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {systems.map((system) => {
            const hw = system.hardwareInfo;
            const topRecommendation = getModelRecommendation(hw?.whatllmRecs);
            void getTotalVRAM(hw?.gpuInfo); // Available for display when needed

            return (
              <Grid item xs={12} lg={6} key={system.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {system.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {system.hostname} ({system.protocol})
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={analyzingId === system.id ? <CircularProgress size={16} /> : <RefreshIcon />}
                        onClick={() => handleAnalyze(system.id)}
                        disabled={analyzingId === system.id}
                      >
                        {analyzingId === system.id ? 'Analyzing...' : 'Re-analyze'}
                      </Button>
                    </Box>

                    {!hw ? (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        No hardware analysis available. Click "Re-analyze" to run WhichLLM.
                      </Alert>
                    ) : (
                      <>
                        {/* Hardware Summary */}
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                            Hardware Specifications
                          </Typography>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Component</TableCell>
                                  <TableCell>Details</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                <TableRow>
                                  <TableCell>CPU</TableCell>
                                  <TableCell>
                                    {hw.cpuModel || 'Unknown'} ({hw.cpuCores || 0} cores / {hw.cpuThreads || 0} threads)
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>RAM</TableCell>
                                  <TableCell>{hw.ramGB || 0} GB</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>GPU</TableCell>
                                  <TableCell>{getGPUSummary(hw.gpuInfo)}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>OS</TableCell>
                                  <TableCell>{hw.os || 'Unknown'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell>Kernel</TableCell>
                                  <TableCell>{hw.kernel || 'Unknown'}</TableCell>
                                </TableRow>
                                {hw.dockerVersion && (
                                  <TableRow>
                                    <TableCell>Docker</TableCell>
                                    <TableCell>{hw.dockerVersion}</TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>

                        {/* Model Recommendations */}
                        {hw.whatllmRecs && hw.whatllmRecs.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                              Model Recommendations
                            </Typography>

                            {/* Top Recommendation Card */}
                            {topRecommendation && (
                              <Alert
                                severity="success"
                                icon={<AIIcon />}
                                sx={{ mb: 2 }}
                              >
                                <Typography variant="body1" fontWeight={600}>
                                  Recommended: {topRecommendation.name}
                                </Typography>
                                <Typography variant="body2">
                                  Quantization: {topRecommendation.quantization} •{' '}
                                  {topRecommendation.vramRequired
                                    ? `${topRecommendation.vramRequired}GB VRAM required`
                                    : `${topRecommendation.ramRequired || 'N/A'}GB RAM required`}
                                </Typography>
                              </Alert>
                            )}

                            {/* All Recommendations */}
                            <Grid container spacing={2}>
                              {hw.whatllmRecs.map((rec, idx) => (
                                <Grid item xs={12} sm={6} key={idx}>
                                  <Card variant="outlined">
                                    <CardContent>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Chip
                                          label={rec.type}
                                          size="small"
                                          color={rec.type === 'GPU' ? 'primary' : 'default'}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                          {rec.category}
                                        </Typography>
                                      </Box>
                                      <Typography variant="body2" sx={{ mb: 1 }}>
                                        {rec.reason}
                                      </Typography>
                                      {rec.models && rec.models.length > 0 && (
                                        <Box>
                                          <Divider sx={{ my: 1 }} />
                                          <Typography variant="caption" fontWeight={600}>
                                            Models:
                                          </Typography>
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                            {rec.models.slice(0, 3).map((m: any, i: number) => (
                                              <Chip
                                                key={i}
                                                label={`${m.name} (${m.quantization})`}
                                                size="small"
                                                variant="outlined"
                                              />
                                            ))}
                                            {rec.models.length > 3 && (
                                              <Chip
                                                label={`+${rec.models.length - 3} more`}
                                                size="small"
                                                variant="outlined"
                                              />
                                            )}
                                          </Box>
                                        </Box>
                                      )}
                                    </CardContent>
                                  </Card>
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        )}

                        {/* Analysis Timestamp */}
                        {hw.analyzedAt && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                            Last analyzed: {new Date(hw.analyzedAt).toLocaleString()}
                          </Typography>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
