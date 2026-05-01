import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Card, CardContent, Typography, Chip, Paper, Stack, Avatar, Tooltip } from '@mui/material';
import { Business, CurrencyRupee, Schedule, Warning } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  NEW:        { label: 'New',        color: '#3b82f6', bg: '#eff6ff',  border: '#bfdbfe', icon: '🆕' },
  CONTACTED:  { label: 'Contacted',  color: '#6366f1', bg: '#eef2ff',  border: '#c7d2fe', icon: '📞' },
  FOLLOW_UP:  { label: 'Follow Up',  color: '#f59e0b', bg: '#fffbeb',  border: '#fde68a', icon: '🔔' },
  CONVERTED:  { label: 'Converted',  color: '#10b981', bg: '#ecfdf5',  border: '#a7f3d0', icon: '✅' },
  LOST:       { label: 'Lost',       color: '#ef4444', bg: '#fef2f2',  border: '#fecaca', icon: '❌' },
  CLOSED:     { label: 'Closed',     color: '#64748b', bg: '#f8fafc',  border: '#e2e8f0', icon: '📁' },
};

const EnquiryKanban = ({ enquiries, onStatusChange }) => {
  const navigate = useNavigate();

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
      <Box sx={{ display: 'flex', overflowX: 'auto', pb: 2, gap: 2, minHeight: '65vh' }}>
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const items = getColumnEnquiries(status);
          const colValue = getColumnValue(status);

          return (
            <Box key={status} sx={{ minWidth: 290, width: 290, flexShrink: 0 }}>
              <Paper elevation={0} sx={{
                height: '100%', display: 'flex', flexDirection: 'column',
                borderRadius: 3, border: `1px solid ${cfg.border}`,
                bgcolor: cfg.bg, overflow: 'hidden',
              }}>
                {/* Column Header */}
                <Box sx={{ p: 2, borderBottom: `2px solid ${cfg.color}30` }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: cfg.color, letterSpacing: '-0.01em' }}>
                        {cfg.icon} {cfg.label}
                      </Typography>
                    </Stack>
                    <Chip
                      label={items.length}
                      size="small"
                      sx={{
                        height: 22, fontWeight: 800, fontSize: '0.7rem',
                        bgcolor: `${cfg.color}20`, color: cfg.color,
                        border: `1px solid ${cfg.color}40`,
                      }}
                    />
                  </Stack>
                  {colValue > 0 && (
                    <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 600, mt: 0.5, display: 'block' }}>
                      ₹{colValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Typography>
                  )}
                </Box>

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
                              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                {/* Header: Enquiry No + Date */}
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: cfg.color, fontSize: '0.7rem' }}>
                                    {enquiry.enqNo}
                                  </Typography>
                                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                    {enquiry.enqDate}
                                  </Typography>
                                </Stack>

                                {/* Opportunity Name */}
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', mb: 1, lineHeight: 1.3 }}>
                                  {enquiry.opportunityName || 'Untitled Lead'}
                                </Typography>

                                {/* Company */}
                                <Stack direction="row" alignItems="center" spacing={0.75} mb={0.75}>
                                  <Avatar sx={{ width: 20, height: 20, bgcolor: '#f1f5f9', color: '#64748b', fontSize: '0.6rem' }}>
                                    <Business sx={{ fontSize: 12 }} />
                                  </Avatar>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                    {enquiry.companyName || 'No Company'}
                                  </Typography>
                                </Stack>

                                {/* Footer: Revenue + Follow-up */}
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
                                  {parseFloat(enquiry.expectedRevenue) > 0 ? (
                                    <Chip
                                      icon={<CurrencyRupee sx={{ fontSize: '0.7rem !important' }} />}
                                      label={parseFloat(enquiry.expectedRevenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                      size="small"
                                      sx={{
                                        height: 22, fontSize: '0.68rem', fontWeight: 700,
                                        bgcolor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                                        '& .MuiChip-icon': { color: '#16a34a' },
                                      }}
                                    />
                                  ) : <Box />}

                                  {enquiry.daysForNextFollowup != null && (
                                    <Tooltip title={enquiry.daysForNextFollowup <= 0 ? 'Overdue!' : `Follow-up in ${enquiry.daysForNextFollowup} day(s)`}>
                                      <Chip
                                        icon={enquiry.daysForNextFollowup <= 0 ? <Warning sx={{ fontSize: '0.7rem !important' }} /> : <Schedule sx={{ fontSize: '0.7rem !important' }} />}
                                        label={enquiry.daysForNextFollowup <= 0 ? 'Overdue' : `${enquiry.daysForNextFollowup}d`}
                                        size="small"
                                        sx={{
                                          height: 20, fontSize: '0.62rem', fontWeight: 700,
                                          bgcolor: enquiry.daysForNextFollowup <= 0 ? '#fef2f2' : '#f8fafc',
                                          color: enquiry.daysForNextFollowup <= 0 ? '#dc2626' : '#64748b',
                                          border: `1px solid ${enquiry.daysForNextFollowup <= 0 ? '#fecaca' : '#e2e8f0'}`,
                                        }}
                                      />
                                    </Tooltip>
                                  )}
                                </Stack>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && (
                        <Box sx={{
                          p: 3, textAlign: 'center',
                          border: '2px dashed #e2e8f0', borderRadius: 2,
                          color: '#94a3b8',
                        }}>
                          <Typography variant="caption" fontWeight={600}>Drop leads here</Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            </Box>
          );
        })}
      </Box>
    </DragDropContext>
  );
};

export default EnquiryKanban;
