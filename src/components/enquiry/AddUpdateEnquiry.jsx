import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Button, Divider, Grid, TextField, Typography, Autocomplete, MenuItem, Tabs, Tab,TableContainer,TableHead, TableBody, Table, TableRow,TableCell, Paper, List, InputAdornment, Stack, Tooltip, Container, Avatar, IconButton, ToggleButton, ToggleButtonGroup, Chip, CircularProgress, Alert
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import apiService from '../../services/apiService';
import { inventoryItemSearch, searchContacts } from '../../services/commonAPI';
import { useParams, useNavigate } from 'react-router-dom';
import {Save, ArrowBack, Add, Delete, History, ShoppingCart, Info, SwapHoriz, LocalFireDepartment, Thermostat, AcUnit, Call, Email, MeetingRoom, Description, DeleteOutline} from '@mui/icons-material';

/* ── Premium Design Tokens ── */
const T = {
    primary: '#2563eb',
    success: '#059669',
    error:   '#dc2626',
    warning: '#d97706',
    bg:      '#f8fafc',
    card:    '#ffffff',
    border:  '#e2e8f0',
    text:    '#0f172a',
    textSec: '#64748b',
    accent:  '#eff6ff',
};

const SOURCES = ['IndiaMart', 'TradeIndia', 'Website', 'Exhibition', 'Referral', 'Phone', 'Direct', 'Social Media'];
const PRIORITIES = [
  { value: 'HOT', label: 'Hot', icon: <LocalFireDepartment sx={{fontSize: 16}} />, color: '#ef4444' },
  { value: 'WARM', label: 'Warm', icon: <Thermostat sx={{fontSize: 16}} />, color: '#f59e0b' },
  { value: 'COLD', label: 'Cold', icon: <AcUnit sx={{fontSize: 16}} />, color: '#3b82f6' }
];
const CONVERSATION_TYPES = [
  { value: 'NOTE', label: 'Note', icon: <Description sx={{fontSize: 14}} /> },
  { value: 'CALL', label: 'Call', icon: <Call sx={{fontSize: 14}} /> },
  { value: 'EMAIL', label: 'Email', icon: <Email sx={{fontSize: 14}} /> },
  { value: 'MEETING', label: 'Meeting', icon: <MeetingRoom sx={{fontSize: 14}} /> }
];

const AddUpdateEnquiry = ({ onSave }) => {
  const { enquiryId } = useParams();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState({});
  const [companyList, setCompanyList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [productList, setProductList] = useState([]);
  const [isConverting, setIsConverting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    if (enquiryId) fetchEnquiryDetails(enquiryId);
  }, [enquiryId]);

  const fetchEnquiryDetails = async (id) => {
    setLoading(true);
    try {
        const res = await apiService.get(`/enquiry/${id}`);
        setInitialData(res);
        if (res.contact) setCompanyList([res.contact]);
        if (res.assignedTo) setUserList([res.assignedTo]);
        const initialProductOptions = res.enquiredProducts?.map(p => p.inventoryItem).filter(Boolean);
        if (initialProductOptions?.length) setProductList(initialProductOptions);
    } catch (e) {
        setError("Failed to load enquiry details.");
    } finally {
        setLoading(false);
    }
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      id: enquiryId || '',
      enqNo: initialData.enqNo || '',
      opportunityName: initialData.opportunityName || '',
      enqDate: initialData.enqDate || new Date().toISOString().split('T')[0],
      contact: initialData.contact || null,
      contactPersonName: initialData.contactPersonName || '',
      contactPersonPhone: initialData.contactPersonPhone || '',
      contactPersonEmail: initialData.contactPersonEmail || '',
      lastContactedDate: initialData.lastContactedDate || new Date().toISOString().split('T')[0],
      daysForNextFollowup: initialData.daysForNextFollowup || 7,
      nextFollowupDate: initialData.nextFollowupDate || '',
      followupRemarks: initialData.followupRemarks || '',
      enquirySource: initialData.enquirySource || '',
      referenceNumber: initialData.referenceNumber || '',
      enquiredProducts: initialData.enquiredProducts || [],
      status: initialData.status || 'NEW',
      closedDate: initialData.closedDate || '',
      closeReason: initialData.closeReason || '',
      enquiryConversationRecords: initialData.enquiryConversationRecords || [],
      expectedRevenue: initialData.expectedRevenue || 0,
      probability: initialData.probability || 0,
      targetCloseDate: initialData.targetCloseDate || '',
      priority: initialData.priority || 'WARM',
      city: initialData.city || '',
      state: initialData.state || '',
      assignedTo: initialData.assignedTo || null,
      leadQuality: initialData.leadQuality || 'UNKNOWN',
    },
    validationSchema: Yup.object({
      opportunityName: Yup.string().required('Opportunity Name is required'),
      enqDate: Yup.string().required('Enquiry Date is required'),
      contact: Yup.object().nullable().required('Company is required'),
      status: Yup.string().required('Status is required'),
      probability: Yup.number().min(0).max(100, 'Probability must be 0-100'),
    }),
    onSubmit: (values) => onSave({ ...values })
  });

  const handleSearchContacts = async (query) => {
    const result = await searchContacts(query);
    setCompanyList(result);
  };

  const handleSearchUsers = async (query) => {
    const { searchUsers } = await import('../../services/commonAPI');
    const result = await searchUsers(query);
    setUserList(result);
  };

  const handleSearchProducts = (query) => {
    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(async () => {
      const result = await inventoryItemSearch(query);
      setProductList(result);
    }, 500);
  };

  const addProduct = () => {
    formik.setFieldValue('enquiredProducts', [
      ...formik.values.enquiredProducts,
      { inventoryItem: null, productNameRequired: '', qty: 1, specialInstruction: '', pricePerUnit: 0 }
    ]);
    setActiveTab(1);
  };
  
  const removeProduct = (index) => {
    const updated = [...formik.values.enquiredProducts];
    updated.splice(index, 1);
    formik.setFieldValue('enquiredProducts', updated);
  };

  const addConversation = () => {
    formik.setFieldValue('enquiryConversationRecords', [
      { conversation: '', conversationType: 'NOTE', creationDate: new Date() },
      ...formik.values.enquiryConversationRecords
    ]);
    setActiveTab(2);
  };

  const handleConvertToQuotation = async () => {
    if (!enquiryId) return;
    if (window.confirm('Convert this enquiry to a formal Quotation?')) {
      setIsConverting(true);
      try {
        const res = await apiService.post(`/enquiry/convert-to-quotation/${enquiryId}`);
        navigate(`/quotation/edit/${res}`);
      } catch (err) {
        alert('Failed to convert: ' + err.message);
      } finally {
        setIsConverting(false);
      }
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress size={48} thickness={4} />
    </Box>
  );

  return (
    <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 10 }}>
      <form onSubmit={formik.handleSubmit} noValidate>
        {/* ── Hero Header ── */}
        <Box sx={{ 
            bgcolor: '#0f172a', 
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.05) 0%, transparent 50%)',
            color: 'white', pt: 6, pb: 14 
        }}>
            <Container maxWidth="xl">
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={3} alignItems="center">
                        <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                            <ArrowBack />
                        </IconButton>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
                                {enquiryId ? `Lead: ${formik.values.opportunityName}` : 'Capture New Lead'}
                            </Typography>
                            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                                <Chip label={formik.values.status} size="small" 
                                    sx={{ fontWeight: 900, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', height: 24 }} />
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                                    {formik.values.enqNo ? `#${formik.values.enqNo}` : 'Lead Management'}
                                </Typography>
                            </Stack>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                        {enquiryId && (
                            <Button 
                                variant="outlined" startIcon={<SwapHoriz />} 
                                disabled={isConverting}
                                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2.5, textTransform: 'none', fontWeight: 700, px: 3 }} 
                                onClick={handleConvertToQuotation}
                            >
                                {isConverting ? 'Converting...' : 'Convert to Quote'}
                            </Button>
                        )}
                        <Button
                            type="submit" variant="contained" disableElevation startIcon={<Save />}
                            sx={{ bgcolor: T.primary, borderRadius: 2.5, px: 4, py: 1.2, textTransform: 'none', fontWeight: 800, fontSize: '1rem', '&:hover': { bgcolor: '#1d4ed8' } }}
                        >
                            Save Details
                        </Button>
                    </Stack>
                </Stack>
            </Container>
        </Box>

        <Container maxWidth="xl" sx={{ mt: -8 }}>
            {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 4, fontWeight: 700 }}>{error}</Alert>}

            <Grid container spacing={4}>
                <Grid item xs={12} lg={8.5}>
                    <Stack spacing={4}>
                        <Paper elevation={0} sx={{ borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
                            <Tabs 
                                value={activeTab} 
                                onChange={(e, v) => setActiveTab(v)} 
                                sx={{ 
                                    px: 3, pt: 2, bgcolor: T.bg, borderBottom: `1px solid ${T.border}`,
                                    '& .MuiTab-root': { fontWeight: 800, textTransform: 'none', fontSize: '0.95rem', minHeight: 60 },
                                    '& .Mui-selected': { color: T.primary }
                                }}
                            >
                                <Tab icon={<Info sx={{ fontSize: 18 }} />} iconPosition="start" label="Overview" />
                                <Tab icon={<ShoppingCart sx={{ fontSize: 18 }} />} iconPosition="start" label="Products" />
                                <Tab icon={<History sx={{ fontSize: 18 }} />} iconPosition="start" label="Activity Log" />
                            </Tabs>

                            <Box sx={{ p: 5 }}>
                                {activeTab === 0 && (
                                    <Grid container spacing={4}>
                                        <Grid item xs={12}>
                                            <TextField
                                                label="Opportunity / Project Name"
                                                name="opportunityName"
                                                fullWidth
                                                variant="outlined"
                                                placeholder="Enter a descriptive name for this lead"
                                                value={formik.values.opportunityName}
                                                onChange={formik.handleChange}
                                                error={formik.touched.opportunityName && Boolean(formik.errors.opportunityName)}
                                                helperText={formik.touched.opportunityName && formik.errors.opportunityName}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: T.bg } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Autocomplete
                                                options={companyList}
                                                getOptionLabel={(opt) => opt?.companyName || ''}
                                                value={formik.values.contact}
                                                onInputChange={(e, val) => handleSearchContacts(val)}
                                                onChange={(e, val) => {
                                                    formik.setFieldValue('contact', val);
                                                    if (val && val.personDetails && val.personDetails.length > 0) {
                                                        const primary = val.personDetails.find(p => p.isPrimary) || val.personDetails[0];
                                                        formik.setFieldValue('contactPersonName', primary.personName || '');
                                                        formik.setFieldValue('contactPersonPhone', primary.phoneNumber || '');
                                                        formik.setFieldValue('contactPersonEmail', primary.emailId || '');
                                                    }
                                                }}
                                                renderInput={(params) => (
                                                    <TextField 
                                                        {...params} 
                                                        label="Search Client / Company" 
                                                        fullWidth 
                                                        error={formik.touched.contact && Boolean(formik.errors.contact)}
                                                        helperText={formik.touched.contact && formik.errors.contact}
                                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                                    />
                                                )}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField label="Ref / PO Number" name="referenceNumber" fullWidth value={formik.values.referenceNumber} onChange={formik.handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                        </Grid>
                                        
                                        <Grid item xs={12}>
                                            <Divider><Chip label="Contact Details" size="small" sx={{ fontWeight: 800, color: T.textSec }} /></Divider>
                                        </Grid>

                                        <Grid item xs={12} md={4}>
                                            <TextField label="Contact Person" name="contactPersonName" fullWidth size="small" value={formik.values.contactPersonName} onChange={formik.handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <TextField label="Phone" name="contactPersonPhone" fullWidth size="small" value={formik.values.contactPersonPhone} onChange={formik.handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <TextField label="Email" name="contactPersonEmail" fullWidth size="small" value={formik.values.contactPersonEmail} onChange={formik.handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField label="City" name="city" fullWidth size="small" value={formik.values.city} onChange={formik.handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField label="State" name="state" fullWidth size="small" value={formik.values.state} onChange={formik.handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Divider><Chip label="Commercials" size="small" sx={{ fontWeight: 800, color: T.textSec }} /></Divider>
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                label="Estimated Deal Value"
                                                name="expectedRevenue"
                                                type="number"
                                                fullWidth
                                                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                                                value={formik.values.expectedRevenue}
                                                onChange={formik.handleChange}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontWeight: 900, color: T.primary } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                label="Probability (%)"
                                                name="probability"
                                                type="number"
                                                fullWidth
                                                value={formik.values.probability}
                                                onChange={formik.handleChange}
                                                error={formik.touched.probability && Boolean(formik.errors.probability)}
                                                helperText={formik.touched.probability && formik.errors.probability}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontWeight: 900 } }}
                                            />
                                        </Grid>
                                    </Grid>
                                )}

                                {activeTab === 1 && (
                                    <Box>
                                        <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                            <Typography variant="h6" sx={{ fontWeight: 900 }}>Product Interest</Typography>
                                            <Button startIcon={<Add />} variant="contained" disableElevation onClick={addProduct} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, bgcolor: T.text }}>
                                                Add Item
                                            </Button>
                                        </Box>
                                        <TableContainer sx={{ border: `1px solid ${T.border}`, borderRadius: 4 }}>
                                            <Table>
                                                <TableHead sx={{ bgcolor: T.bg }}>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 900, color: T.textSec, py: 1.5 }}>Product Details</TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 900, color: T.textSec, py: 1.5 }}>Qty</TableCell>
                                                        <TableCell sx={{ fontWeight: 900, color: T.textSec, py: 1.5 }}>Instructions</TableCell>
                                                        <TableCell align="center" sx={{ py: 1.5 }}></TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {formik.values.enquiredProducts.map((item, index) => (
                                                        <TableRow key={index} sx={{ '&:hover': { bgcolor: `${T.primary}04` } }}>
                                                            <TableCell sx={{ py: 2.5, minWidth: 250 }}>
                                                                <Autocomplete
                                                                    freeSolo
                                                                    options={productList}
                                                                    getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt?.name || ''}
                                                                    value={formik.values.enquiredProducts[index].inventoryItem || formik.values.enquiredProducts[index].productNameRequired || null}
                                                                    onInputChange={(e, val, reason) => {
                                                                        if (reason === 'input') {
                                                                            formik.setFieldValue(`enquiredProducts[${index}].productNameRequired`, val);
                                                                            handleSearchProducts(val);
                                                                        }
                                                                    }}
                                                                    onChange={(e, val) => {
                                                                        if (typeof val === 'object') formik.setFieldValue(`enquiredProducts[${index}].inventoryItem`, val);
                                                                        else formik.setFieldValue(`enquiredProducts[${index}].productNameRequired`, val);
                                                                    }}
                                                                    renderInput={(params) => <TextField {...params} variant="standard" placeholder="Search product..." sx={{ '& input': { fontWeight: 800 } }} />}
                                                                />
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <TextField name={`enquiredProducts[${index}].qty`} type="number" size="small" value={item.qty} onChange={formik.handleChange} sx={{ width: 80, '& input': { textAlign: 'center', fontWeight: 800, bgcolor: T.bg, borderRadius: 1.5 } }} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <TextField name={`enquiredProducts[${index}].specialInstruction`} variant="standard" fullWidth placeholder="Notes..." value={item.specialInstruction} onChange={formik.handleChange} sx={{ '& input': { fontSize: '0.85rem' } }} />
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <IconButton color="error" onClick={() => removeProduct(index)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                                                    <DeleteOutline fontSize="small" />
                                                                </IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                        {formik.values.enquiredProducts.length === 0 && (
                                            <Box p={6} textAlign="center" sx={{ bgcolor: T.bg, mt: 2, borderRadius: 4, border: `1px dashed ${T.border}` }}>
                                                <Typography color="textSecondary" sx={{ fontWeight: 600 }}>No specific products noted for this lead.</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                )}

                                {activeTab === 2 && (
                                    <Box>
                                        <Box display="flex" justifyContent="space-between" mb={3} alignItems="center">
                                            <Typography variant="h6" sx={{ fontWeight: 900 }}>Activity Records</Typography>
                                            <Button startIcon={<Add />} variant="contained" disableElevation onClick={addConversation} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, bgcolor: T.text }}>
                                                New Entry
                                            </Button>
                                        </Box>
                                        <Stack spacing={3}>
                                            {formik.values.enquiryConversationRecords.map((item, index) => (
                                                <Paper key={index} elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${T.border}`, bgcolor: T.bg }}>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={12}>
                                                            <TextField
                                                                multiline rows={2}
                                                                placeholder="Record conversation details, meeting outcomes or internal notes..."
                                                                name={`enquiryConversationRecords[${index}].conversation`}
                                                                fullWidth
                                                                value={item.conversation}
                                                                onChange={formik.handleChange}
                                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'white' } }}
                                                            />
                                                        </Grid>
                                                        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
                                                            <Stack direction="row" spacing={2} alignItems="center">
                                                                <ToggleButtonGroup
                                                                    value={item.conversationType || 'NOTE'}
                                                                    exclusive
                                                                    onChange={(e, val) => val && formik.setFieldValue(`enquiryConversationRecords[${index}].conversationType`, val)}
                                                                    size="small"
                                                                    sx={{ bgcolor: 'white', p: 0.5, borderRadius: 2 }}
                                                                >
                                                                    {CONVERSATION_TYPES.map(t => (
                                                                        <Tooltip title={t.label} key={t.value}>
                                                                            <ToggleButton value={t.value} sx={{ p: 0.8, borderRadius: '8px !important', '&.Mui-selected': { bgcolor: `${T.primary}10`, color: T.primary } }}>{t.icon}</ToggleButton>
                                                                        </Tooltip>
                                                                    ))}
                                                                </ToggleButtonGroup>
                                                                <Typography variant="caption" sx={{ fontWeight: 700, color: T.textSec }}>
                                                                    {item.creationDate ? new Date(item.creationDate).toLocaleString() : 'Just Now'}
                                                                </Typography>
                                                            </Stack>
                                                            <IconButton color="error" size="small" onClick={() => {
                                                                const updated = [...formik.values.enquiryConversationRecords];
                                                                updated.splice(index, 1);
                                                                formik.setFieldValue('enquiryConversationRecords', updated);
                                                            }}>
                                                                <DeleteOutline />
                                                            </IconButton>
                                                        </Grid>
                                                    </Grid>
                                                </Paper>
                                            ))}
                                        </Stack>
                                        {formik.values.enquiryConversationRecords.length === 0 && (
                                            <Box p={6} textAlign="center" sx={{ bgcolor: T.bg, mt: 2, borderRadius: 4, border: `1px dashed ${T.border}` }}>
                                                <Typography color="textSecondary" sx={{ fontWeight: 600 }}>No interactions recorded yet.</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    </Stack>
                </Grid>

                <Grid item xs={12} lg={3.5}>
                    <Stack spacing={4} sx={{ position: 'sticky', top: 40 }}>
                        {/* Status Management */}
                        <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
                            <Typography sx={{ fontWeight: 900, mb: 3, color: T.text }}>Lifecycle & Status</Typography>
                            <Stack spacing={3}>
                                <TextField
                                    select label="Pipeline Stage" name="status" fullWidth
                                    value={formik.values.status} onChange={formik.handleChange}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: T.bg } }}
                                >
                                    {['NEW', 'QUALIFIED', 'CONTACTED', 'FOLLOW_UP', 'QUOTED', 'NEGOTIATION', 'CONVERTED', 'LOST', 'JUNK', 'CLOSED'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                </TextField>
                                
                                <Box>
                                    <Typography variant="caption" sx={{ color: T.textSec, fontWeight: 900, textTransform: 'uppercase', display: 'block', mb: 1.5 }}>Lead Priority</Typography>
                                    <ToggleButtonGroup
                                        value={formik.values.priority}
                                        exclusive
                                        onChange={(e, val) => val && formik.setFieldValue('priority', val)}
                                        fullWidth
                                        sx={{ bgcolor: T.bg, p: 0.5, borderRadius: 3 }}
                                    >
                                        {PRIORITIES.map(p => (
                                            <ToggleButton key={p.value} value={p.value} sx={{ 
                                                border: 'none', borderRadius: '10px !important', py: 1, textTransform: 'none', fontWeight: 800,
                                                '&.Mui-selected': { bgcolor: 'white', color: p.color, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' } 
                                            }}>
                                                {p.icon} <Box ml={1}>{p.label}</Box>
                                            </ToggleButton>
                                        ))}
                                    </ToggleButtonGroup>
                                </Box>

                                <Autocomplete
                                    options={userList}
                                    getOptionLabel={(opt) => opt?.username || ''}
                                    value={formik.values.assignedTo}
                                    onInputChange={(e, val) => handleSearchUsers(val)}
                                    onChange={(e, val) => formik.setFieldValue('assignedTo', val)}
                                    renderInput={(params) => <TextField {...params} label="Assigned Rep" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />}
                                />
                            </Stack>
                        </Paper>

                        {/* Dates & Followups */}
                        <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: `1px solid ${T.border}`, bgcolor: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
                            <Typography sx={{ fontWeight: 900, mb: 3, color: T.text }}>Timeline</Typography>
                            <Stack spacing={3}>
                                <TextField label="Enquiry Date" type="date" name="enqDate" fullWidth InputLabelProps={{ shrink: true }} value={formik.values.enqDate} onChange={formik.handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                <TextField label="Target Close" type="date" name="targetCloseDate" fullWidth InputLabelProps={{ shrink: true }} value={formik.values.targetCloseDate} onChange={formik.handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                <TextField label="Next Follow-up" type="date" name="nextFollowupDate" fullWidth InputLabelProps={{ shrink: true }} value={formik.values.nextFollowupDate} onChange={formik.handleChange} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: `${T.warning}08` } }} />
                                
                                <Autocomplete
                                    freeSolo options={SOURCES}
                                    value={formik.values.enquirySource}
                                    onChange={(e, val) => formik.setFieldValue('enquirySource', val)}
                                    onInputChange={(e, val) => formik.setFieldValue('enquirySource', val)}
                                    renderInput={(params) => <TextField {...params} label="Inbound Source" fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />}
                                />
                            </Stack>
                        </Paper>
                    </Stack>
                </Grid>
            </Grid>
        </Container>
      </form>
    </Box>
  );
};

export default AddUpdateEnquiry;
