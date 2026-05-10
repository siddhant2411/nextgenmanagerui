import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Card, CardContent, Typography, Chip, Paper, Stack, Avatar, Tooltip } from '@mui/material';
import { Business, CurrencyRupee, Schedule, Warning, LocalFireDepartment, Thermostat, AcUnit, Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  NEW:        { label: 'New',        color: '#3b82f6', bg: '#eff6ff',  border: '#bfdbfe', icon: '🆕' },
  QUALIFIED:  { label: 'Qualified',  color: '#0ea5e9', bg: '#f0f9ff',  border: '#bae6fd', icon: '🎯' },
  CONTACTED:  { label: 'Contacted',  color: '#6366f1', bg: '#eef2ff',  border: '#c7d2fe', icon: '📞' },
  FOLLOW_UP:  { label: 'Follow Up',  color: '#f59e0b', bg: '#fffbeb',  border: '#fde68a', icon: '🔔' },
  QUOTED:     { label: 'Quoted',     color: '#0891b2', bg: '#ecfeff',  border: '#a5f3fc', icon: '📄' },
  NEGOTIATION:{ label: 'Negotiation', color: '#8b5cf6', bg: '#f5f3ff',  border: '#ddd6fe', icon: '🤝' },
  CONVERTED:  { label: 'Converted',  color: '#10b981', bg: '#ecfdf5',  border: '#a7f3d0', icon: '✅' },
  LOST:       { label: 'Lost',       color: '#ef4444', bg: '#fef2f2',  border: '#fecaca', icon: '❌' },
  JUNK:       { label: 'Junk',       color: '#94a3b8', bg: '#f8fafc',  border: '#e2e8f0', icon: '🗑️' },
  CLOSED:     { label: 'Closed',     color: '#64748b', bg: '#f8fafc',  border: '#e2e8f0', icon: '📁' },
};

const PRIORITY_CONFIG = {
  HOT:  { color: '#ef4444', icon: <LocalFireDepartment sx={{fontSize: 14}} />, label: 'Hot' },
  WARM: { color: '#f59e0b', icon: <Thermostat sx={{fontSize: 14}} />, label: 'Warm' },
  COLD: { color: '#3b82f6', icon: <AcUnit sx={{fontSize: 14}} />, label: 'Cold' },
};

const EnquiryKanban = ({ enquiries, onStatusChange }) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState({
    CONVERTED: true,
    LOST: true,
    JUNK: true,
    CLOSED: true
  });

  const toggleCollapse = (status) => {
    setCollapsed(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    onStatusChange(parseInt(draggableId), destination.droppableId);
  };

  const getColumnEnquiries = (status) => enquiries.filter(e => e.status === status);

  const getColumnValue = (status) => {
    return getColumnEnquiries(status).reduce((sum, e) => sum + (parseFloat(e.expectedRevenue) || 0), 0);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box sx={{ 
        display: 'flex', 
        overflowX: 'auto', 
        pb: 2, 
        gap: 1.5, 
        minHeight: '70vh',
        '&::-webkit-scrollbar': { height: 8 },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 4 },
        '&::-webkit-scrollbar-track': { bgcolor: '#f1f5f9' }
      }}>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const items = getColumnEnquiries(status);
          const colValue = getColumnValue(status);
          const isCollapsed = collapsed[status];

          return (
            <Box 
              key={status} 
              sx={{ 
                minWidth: isCollapsed ? 48 : 280, 
                width: isCollapsed ? 48 : 280, 
                flexShrink: 0,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <Paper elevation={0} sx={{
                height: '100%', display: 'flex', flexDirection: 'column',
                borderRadius: isCollapsed ? 2 : 3, 
                border: `1px solid ${cfg.border}`,
                bgcolor: cfg.bg, overflow: 'hidden',
                position: 'relative'
              }}>
                {/* Column Header */}
                <Box 
                  onClick={() => isCollapsed && toggleCollapse(status)}
                  sx={{ 
                    p: isCollapsed ? 1 : 2, 
                    borderBottom: isCollapsed ? 'none' : `2px solid ${cfg.color}30`,
                    cursor: isCollapsed ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: isCollapsed ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    '&:hover': isCollapsed ? { bgcolor: `${cfg.color}10` } : {}
                  }}
                >
                  {!isCollapsed ? (
                    <>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 800, color: cfg.color, letterSpacing: '-0.01em', fontSize: '0.75rem' }}>
                          {cfg.icon} {cfg.label}
                        </Typography>
                        <Tooltip title="Collapse Column">
                          <Typography 
                            variant="caption" 
                            onClick={(e) => { e.stopPropagation(); toggleCollapse(status); }}
                            sx={{ cursor: 'pointer', color: cfg.color, opacity: 0.5, '&:hover': { opacity: 1 } }}
                          >
                            «
                          </Typography>
                        </Tooltip>
                      </Stack>
                      <Chip
                        label={items.length}
                        size="small"
                        sx={{
                          height: 20, fontWeight: 800, fontSize: '0.65rem',
                          bgcolor: `${cfg.color}20`, color: cfg.color,
                          border: `1px solid ${cfg.color}40`,
                        }}
                      />
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 1 }}>
                      <Typography variant="h6" sx={{ color: cfg.color, mb: 1, fontSize: '1rem' }}>{cfg.icon}</Typography>
                      <Typography sx={{ 
                        writingMode: 'vertical-rl', 
                        transform: 'rotate(180deg)', 
                        color: cfg.color, 
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        my: 2
                      }}>
                        {cfg.label}
                      </Typography>
                      <Chip
                        label={items.length}
                        size="small"
                        sx={{
                          height: 20, width: 20, p: 0, fontWeight: 800, fontSize: '0.6rem',
                          bgcolor: `${cfg.color}20`, color: cfg.color,
                          '& .MuiChip-label': { px: 0 }
                        }}
                      />
                    </Box>
                  )}
                </Box>

                {!isCollapsed && (
                  <>
                    {colValue > 0 && (
                      <Box sx={{ px: 2, pb: 1, mt: -1 }}>
                        <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 700, fontSize: '0.65rem' }}>
                          ₹{colValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Typography>
                      </Box>
                    )}

                    {/* Droppable Area */}
                    <Droppable droppableId={status}>
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          sx={{
                            flexGrow: 1, p: 1.5, minHeight: 80,
                            bgcolor: snapshot.isDraggingOver ? `${cfg.color}08` : 'transparent',
                            transition: 'background-color 0.2s',
                            overflowY: 'auto',
                            maxHeight: 'calc(100vh - 300px)'
                          }}
                        >
                          {items.map((enquiry, index) => (
                            <Draggable key={enquiry.id.toString()} draggableId={enquiry.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  elevation={snapshot.isDragging ? 8 : 0}
                                  sx={{
                                    mb: 1.5, borderRadius: 2.5,
                                    border: '1px solid #e2e8f0',
                                    bgcolor: 'white',
                                    cursor: 'pointer',
                                    transition: 'box-shadow 0.2s, transform 0.15s',
                                    '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)', transform: 'translateY(-1px)' },
                                    ...(snapshot.isDragging && { transform: 'rotate(2deg)' }),
                                  }}
                                  onClick={() => navigate(`/enquiry/edit/${enquiry.id}`)}
                                >
                                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                          {enquiry.priority && (
                                            <Tooltip title={`${PRIORITY_CONFIG[enquiry.priority]?.label} Priority`}>
                                              <Box sx={{ color: PRIORITY_CONFIG[enquiry.priority]?.color }}>
                                                {PRIORITY_CONFIG[enquiry.priority]?.icon}
                                              </Box>
                                            </Tooltip>
                                          )}
                                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                                          {enquiry.enqDate}
                                        </Typography>
                                      </Stack>

                                    {/* Enquiry Number as Title */}
                                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.25, fontSize: '0.78rem' }}>
                                      {enquiry.enqNo}
                                    </Typography>

                                    {/* Opportunity Name as Subtitle */}
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155', mb: 1, lineHeight: 1.2, fontSize: '0.68rem' }}>
                                      {enquiry.opportunityName || 'Untitled Lead'}
                                    </Typography>

                                    {/* Footer: Revenue + Follow-up */}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
                                      {parseFloat(enquiry.expectedRevenue) > 0 ? (
                                        <Typography sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#16a34a' }}>
                                          ₹{parseFloat(enquiry.expectedRevenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </Typography>
                                      ) : <Box />}

                                      {enquiry.daysForNextFollowup != null && (
                                        <Chip
                                          icon={enquiry.daysForNextFollowup <= 0 ? <Warning sx={{ fontSize: '9px !important' }} /> : <Schedule sx={{ fontSize: '9px !important' }} />}
                                          label={enquiry.daysForNextFollowup <= 0 ? 'Due' : `${enquiry.daysForNextFollowup}d`}
                                          size="small"
                                          sx={{
                                            height: 16, fontSize: '0.58rem', fontWeight: 700,
                                            bgcolor: enquiry.daysForNextFollowup <= 0 ? '#fef2f2' : '#f8fafc',
                                            color: enquiry.daysForNextFollowup <= 0 ? '#dc2626' : '#64748b',
                                            border: `1px solid ${enquiry.daysForNextFollowup <= 0 ? '#fecaca' : '#e2e8f0'}`,
                                            '& .MuiChip-icon': { ml: 0.5 }
                                          }}
                                        />
                                      )}
                                    </Stack>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </Box>
                      )}
                    </Droppable>
                  </>
                )}
              </Paper>
            </Box>
          );
        })}
      </Box>
    </DragDropContext>
  );
};

export default EnquiryKanban;
