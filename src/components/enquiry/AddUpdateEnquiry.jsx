import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Button, Card, CardContent, CardHeader, Divider, Grid, TextField, Typography, Autocomplete, Tabs, Tab, Paper, List, ListItem, ListItemText, InputAdornment
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import apiService from '../../services/apiService';
import { inventoryItemSearch, searchContacts } from '../../services/commonAPI';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowBack, Add, Delete, History, ShoppingCart, Info } from '@mui/icons-material';
import {IconButton} from '@mui/material';
const AddUpdateEnquiry = ({ onSave }) => {
  const { enquiryId } = useParams();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState({});
  const [companyList, setCompanyList] = useState([]);
  const [productList, setProductList] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    if (enquiryId) fetchEnquiryDetails(enquiryId);
  }, [enquiryId]);

  const fetchEnquiryDetails = async (id) => {
    const res = await apiService.get(`/enquiry/${id}`);
    setInitialData(res);
    if (res.contact) setCompanyList([res.contact]);
    const initialProductOptions = res.enquiredProducts?.map(p => p.inventoryItem).filter(Boolean);
    if (initialProductOptions?.length) setProductList(initialProductOptions);
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
  };
  
  const removeProduct = (index) => {
    const updated = [...formik.values.enquiredProducts];
    updated.splice(index, 1);
    formik.setFieldValue('enquiredProducts', updated);
  };

  const addConversation = () => {
    formik.setFieldValue('enquiryConversationRecords', [
      { conversation: '', creationDate: new Date() },
      ...formik.values.enquiryConversationRecords
    ]);
  };

  return (
    <Box p={3}>
      <form onSubmit={formik.handleSubmit} noValidate>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {enquiryId ? `Edit Enquiry: ${formik.values.enqNo}` : 'New Sales Lead'}
          </Typography>
          <Box display="flex" gap={2}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>Back</Button>
            <Button variant="contained" type="submit" startIcon={<Save />}>Save Enquiry</Button>
          </Box>
        </Box>

        <Card elevation={3}>
          <Tabs 
            value={activeTab} 
            onChange={(e, v) => setActiveTab(v)} 
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}
          >
            <Tab icon={<Info sx={{ fontSize: 18 }} />} iconPosition="start" label="Overview" />
            <Tab icon={<ShoppingCart sx={{ fontSize: 18 }} />} iconPosition="start" label="Products" />
            <Tab icon={<History sx={{ fontSize: 18 }} />} iconPosition="start" label="Timeline & Notes" />
          </Tabs>

          <CardContent sx={{ p: 4 }}>
            {activeTab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: 'primary.main' }}>BASIC DETAILS</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Opportunity Name"
                        name="opportunityName"
                        fullWidth
                        size="small"
                        value={formik.values.opportunityName}
                        onChange={formik.handleChange}
                        error={formik.touched.opportunityName && Boolean(formik.errors.opportunityName)}
                        helperText={formik.touched.opportunityName && formik.errors.opportunityName}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Autocomplete
                        options={companyList}
                        getOptionLabel={(opt) => opt?.companyName || ''}
                        value={formik.values.contact}
                        onInputChange={(e, val) => handleSearchContacts(val)}
                        onChange={(e, val) => formik.setFieldValue('contact', val)}
                        renderInput={(params) => <TextField {...params} label="Company" size="small" fullWidth error={formik.touched.contact && Boolean(formik.errors.contact)} />}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Reference Number" name="referenceNumber" fullWidth size="small" value={formik.values.referenceNumber} onChange={formik.handleChange} />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField label="Contact Person" name="contactPersonName" fullWidth size="small" value={formik.values.contactPersonName} onChange={formik.handleChange} />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField label="Phone" name="contactPersonPhone" fullWidth size="small" value={formik.values.contactPersonPhone} onChange={formik.handleChange} />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField label="Email" name="contactPersonEmail" fullWidth size="small" value={formik.values.contactPersonEmail} onChange={formik.handleChange} />
                    </Grid>
                  </Grid>

                  <Typography variant="subtitle2" sx={{ mt: 4, mb: 2, color: 'primary.main' }}>PIPELINE & SALES DATA</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <TextField
                        label="Expected Revenue"
                        name="expectedRevenue"
                        type="number"
                        fullWidth
                        size="small"
                        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        value={formik.values.expectedRevenue}
                        onChange={formik.handleChange}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="Probability (%)"
                        name="probability"
                        type="number"
                        fullWidth
                        size="small"
                        value={formik.values.probability}
                        onChange={formik.handleChange}
                        error={formik.touched.probability && Boolean(formik.errors.probability)}
                        helperText={formik.touched.probability && formik.errors.probability}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="Target Close Date"
                        type="date"
                        name="targetCloseDate"
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={formik.values.targetCloseDate}
                        onChange={formik.handleChange}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fbfbfb' }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, color: 'primary.main' }}>STATUS & DATES</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          select
                          label="Current Status"
                          name="status"
                          fullWidth
                          size="small"
                          value={formik.values.status}
                          onChange={formik.handleChange}
                          SelectProps={{ native: true }}
                        >
                          {['NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'LOST', 'CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
                        </TextField>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField label="Enquiry Date" type="date" name="enqDate" fullWidth size="small" InputLabelProps={{ shrink: true }} value={formik.values.enqDate} onChange={formik.handleChange} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField label="Next Follow-up" type="date" name="nextFollowupDate" fullWidth size="small" InputLabelProps={{ shrink: true }} value={formik.values.nextFollowupDate} onChange={formik.handleChange} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField label="Source" name="enquirySource" fullWidth size="small" value={formik.values.enquirySource} onChange={formik.handleChange} />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {activeTab === 1 && (
              <Box>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Enquired Products</Typography>
                  <Button startIcon={<Add />} variant="outlined" onClick={addProduct}>Add Product</Button>
                </Box>
                <Paper variant="outlined">
                  <Grid container spacing={0} sx={{ p: 2, bgcolor: '#f5f5f5', fontWeight: 'bold', borderBottom: 1, borderColor: 'divider' }}>
                    <Grid item xs={5}><Typography variant="caption" sx={{ fontWeight: 'bold' }}>PRODUCT</Typography></Grid>
                    <Grid item xs={2}><Typography variant="caption" sx={{ fontWeight: 'bold' }}>QTY</Typography></Grid>
                    <Grid item xs={4}><Typography variant="caption" sx={{ fontWeight: 'bold' }}>INSTRUCTIONS</Typography></Grid>
                    <Grid item xs={1}></Grid>
                  </Grid>
                  {formik.values.enquiredProducts.map((item, index) => (
                    <Grid container spacing={2} key={index} alignItems="center" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                      <Grid item xs={5}>
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
                          renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                        />
                      </Grid>
                      <Grid item xs={2}>
                        <TextField name={`enquiredProducts[${index}].qty`} type="number" size="small" value={item.qty} onChange={formik.handleChange} />
                      </Grid>
                      <Grid item xs={4}>
                        <TextField name={`enquiredProducts[${index}].specialInstruction`} size="small" fullWidth value={item.specialInstruction} onChange={formik.handleChange} />
                      </Grid>
                      <Grid item xs={1}>
                        <IconButton color="error" onClick={() => removeProduct(index)}><Delete /></IconButton>
                      </Grid>
                    </Grid>
                  ))}
                  {formik.values.enquiredProducts.length === 0 && (
                    <Box p={4} textAlign="center">
                      <Typography color="textSecondary">No products added yet.</Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Activity Timeline</Typography>
                  <Button startIcon={<Add />} variant="outlined" onClick={addConversation}>Add Note</Button>
                </Box>
                <List>
                  {formik.values.enquiryConversationRecords.map((item, index) => (
                    <Paper key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            multiline
                            rows={2}
                            placeholder="Type a note or conversation record..."
                            name={`enquiryConversationRecords[${index}].conversation`}
                            fullWidth
                            size="small"
                            value={item.conversation}
                            onChange={formik.handleChange}
                          />
                        </Grid>
                        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" color="textSecondary">
                            {item.creationDate ? new Date(item.creationDate).toLocaleString() : 'New Note'}
                          </Typography>
                          <Button 
                            size="small" 
                            color="error" 
                            startIcon={<Delete />} 
                            onClick={() => {
                              const updated = [...formik.values.enquiryConversationRecords];
                              updated.splice(index, 1);
                              formik.setFieldValue('enquiryConversationRecords', updated);
                            }}
                          >
                            Remove
                          </Button>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </List>
                {formik.values.enquiryConversationRecords.length === 0 && (
                  <Box p={4} textAlign="center" border="1px dashed #ccc" borderRadius={2}>
                    <Typography color="textSecondary">No activity records found. Start by adding a note.</Typography>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </form>
    </Box>
  );
};

export default AddUpdateEnquiry;
