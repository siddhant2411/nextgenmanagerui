import React, { useCallback, useEffect, useState } from 'react';
import {
  Autocomplete, Box, CircularProgress, Paper, Stack, TextField, Toolbar, Typography,
} from '@mui/material';
import { getMachineDetailsList } from '../../../services/machineAssetsService';
import { getMachineScheduleToday } from '../../../services/workOrderService';
import ShopFloorTaskCard from './ShopFloorTaskCard';
import ShopFloorCompleteDialog from './ShopFloorCompleteDialog';
import ShopFloorDowntimeDialog from './ShopFloorDowntimeDialog';
import productionAnalyticsService from '../../../services/productionAnalyticsService';
import { Warning, PlayArrow } from '@mui/icons-material';
import { Button } from '@mui/material';

const PRIORITY_ORDER = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

export default function ShopFloorDashboard({ setSnackbar }) {
  const [machines, setMachines] = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeDowntime, setActiveDowntime] = useState(null);
  const [downtimeDialogOpen, setDowntimeDialogOpen] = useState(false);

  useEffect(() => {
    const loadMachines = async () => {
      try {
        setMachinesLoading(true);
        const response = await getMachineDetailsList();
        const list = Array.isArray(response) ? response : response?.content || [];
        setMachines(list);
      } catch (err) {
        setSnackbar('Failed to load machines.', 'error');
      } finally {
        setMachinesLoading(false);
      }
    };
    loadMachines();
  }, [setSnackbar]);

  const checkDowntime = useCallback(async (machineId) => {
    try {
      const active = await productionAnalyticsService.getActiveDowntime(machineId);
      setActiveDowntime(active || null);
    } catch (err) {
      console.error('Failed to check downtime status', err);
    }
  }, []);

  const loadTasks = useCallback(async (machineId) => {
    if (!machineId) {
      setTasks([]);
      setActiveDowntime(null);
      return;
    }
    try {
      setTasksLoading(true);
      const response = await getMachineScheduleToday(machineId);
      setTasks(response?.tasks || []);
      checkDowntime(machineId);
    } catch (err) {
      setSnackbar('Failed to load machine tasks.', 'error');
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [setSnackbar, checkDowntime]);

  const handleMachineChange = (_, value) => {
    setSelectedMachine(value);
    loadTasks(value?.id);
  };

  const handleOpenComplete = (task) => {
    setSelectedTask(task);
    setCompleteDialogOpen(true);
  };

  const handleCompleteSuccess = () => {
    setSnackbar('Operation progress recorded successfully.', 'success');
    if (selectedMachine?.id) {
      loadTasks(selectedMachine.id);
    }
  };

  const handleStopDowntime = async () => {
    try {
      if (!activeDowntime?.id) {
        console.error('No active downtime ID found:', activeDowntime);
        setSnackbar('No active downtime session found.', 'error');
        return;
      }
      await productionAnalyticsService.stopDowntime(activeDowntime.id);
      setSnackbar('Machine is back online.', 'success');
      checkDowntime(selectedMachine.id);
    } catch (err) {
      setSnackbar('Failed to stop downtime.', 'error');
    }
  };

  const sortedTasks = [...tasks].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
  );

  return (
    <Box
      sx={{
        fontFamily: "'IBM Plex Sans', system-ui",
        background: 'linear-gradient(180deg, #f7f9fc 0%, #eef2f7 100%)',
        p: { xs: 1, sm: 2 },
        borderRadius: 2,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        minHeight: '80vh',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          borderRadius: 2,
          border: '1px solid #e3e8ef',
          boxShadow: '0 10px 26px rgba(2, 12, 27, 0.08)',
          backgroundColor: '#ffffff',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
        }}
      >
        {/* Header Toolbar */}
        <Toolbar
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            background: 'linear-gradient(90deg, rgba(248,250,252,1) 0%, rgba(238,242,247,1) 100%)',
            border: '1px solid #e5e9f2',
            mb: 2.5,
            minHeight: '48px !important',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ width: '100%', alignItems: { xs: 'stretch', sm: 'center' } }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                fontSize: { xs: '1.15rem', sm: '1.5rem' },
                letterSpacing: 0.2,
              }}
            >
              Shop Floor
            </Typography>
            <Box sx={{ flex: 1 }} />
            {selectedMachine && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {selectedMachine.workCenterName || selectedMachine.workCenter?.name || ''}
                </Typography>
                {activeDowntime ? (
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<PlayArrow />}
                    onClick={handleStopDowntime}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Resume Production
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="warning"
                    size="small"
                    startIcon={<Warning />}
                    onClick={() => setDowntimeDialogOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Report Downtime
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        </Toolbar>

        {/* Machine Selector */}
        <Autocomplete
          options={machines}
          getOptionLabel={(m) => `${m.machineCode || ''} — ${m.machineName || m.name || ''}`}
          value={selectedMachine}
          onChange={handleMachineChange}
          loading={machinesLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Machine"
              placeholder="Search machines..."
              size="small"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {machinesLoading ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          sx={{ maxWidth: 480, mb: 3 }}
          isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
        />

        {/* Task Cards */}
        {tasksLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : !selectedMachine ? (
          <Paper
            elevation={0}
            sx={{
              textAlign: 'center',
              py: 8,
              borderRadius: 2,
              border: '1px dashed #d0d7de',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            }}
          >
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
              Select a machine to view today's tasks.
            </Typography>
          </Paper>
        ) : sortedTasks.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              textAlign: 'center',
              py: 8,
              borderRadius: 2,
              border: '1px dashed #d0d7de',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            }}
          >
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
              No tasks scheduled for today.
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sortedTasks.map((task) => (
              <ShopFloorTaskCard
                key={task.operationId}
                task={task}
                onComplete={handleOpenComplete}
              />
            ))}
          </Box>
        )}
      </Paper>

      {/* Complete Dialog */}
      <ShopFloorCompleteDialog
        open={completeDialogOpen}
        onClose={() => setCompleteDialogOpen(false)}
        task={selectedTask}
        onSuccess={handleCompleteSuccess}
      />

      <ShopFloorDowntimeDialog
        open={downtimeDialogOpen}
        onClose={() => setDowntimeDialogOpen(false)}
        machine={selectedMachine}
        onSuccess={() => {
          setSnackbar('Downtime started.', 'success');
          checkDowntime(selectedMachine.id);
        }}
      />
    </Box>
  );
}
