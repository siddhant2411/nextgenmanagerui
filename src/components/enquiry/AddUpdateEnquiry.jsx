import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Button, Card, CardContent, CardHeader, Divider, Grid, TextField, Typography, Autocomplete
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import apiService from '../../services/apiService';
import { inventoryItemSearch, searchContacts } from '../../services/commonAPI';
import { useParams } from 'react-router-dom';

const AddUpdateEnquiry = ({ onSave }) => {
  const { enquiryId } = useParams();
  const [initialData, setInitialData] = useState({});
  const [companyList, setCompanyList] = useState([]);
  const [productList, setProductList] = useState([]);
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
      enqDate: initialData.enqDate || '',
      contact: initialData.contact || null,
      contactPersonName: initialData.contactPersonName || '',
      contactPersonPhone: initialData.contactPersonPhone || '',
      contactPersonEmail: initialData.contactPersonEmail || '',
      lastContactedDate: initialData.lastContactedDate || '',
      daysForNextFollowup: initialData.daysForNextFollowup || 30,
      nextFollowupDate: initialData.nextFollowupDate || '',
      followupRemarks: initialData.followupRemarks || '',
      enquirySource: initialData.enquirySource || '',
      referenceNumber: initialData.referenceNumber || '',
      enquiredProducts: initialData.enquiredProducts || [],
      status: initialData.status || 'NEW',
      closedDate: initialData.closedDate || '',
      closeReason: initialData.closeReason || '',
      enquiryConversationRecords: initialData.enquiryConversationRecords || [],
    },
    validationSchema: Yup.object({
      opportunityName: Yup.string().required('Opportunity Name is required'),
      enqDate: Yup.string().required('Enquiry Date is required'),
      contact: Yup.object().nullable().required('Company is required'),
      lastContactedDate: Yup.string().required('Last Contacted Date is required'),
      status: Yup.string().required('Status is required'),

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
      {
        inventoryItem: null,
        productNameRequired: '',
        qty: 1,
        specialInstruction: ''
      }
    ]);
  };
  const removeProduct = (index) => {
    const updated = [...formik.values.enquiredProducts];
    updated.splice(index, 1);
    formik.setFieldValue('enquiredProducts', updated);
  };

  const addConversation = () => {
    formik.setFieldValue('enquiryConversationRecords', [
      ...formik.values.enquiryConversationRecords,
      { conversation: '' }
    ]);
  };

  const removeConversation = (index) => {
    const updated = [...formik.values.enquiryConversationRecords];
    updated.splice(index, 1);
    formik.setFieldValue('enquiryConversationRecords', updated);
  };

  return (
    <form onSubmit={formik.handleSubmit} noValidate>
      <Card>
        <CardHeader title="Add / Edit Enquiry" sx={{ backgroundColor: '#f5f5f5' }} />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Opportunity Name"
                name="opportunityName"
                fullWidth
                size="small"
                value={formik.values.opportunityName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.opportunityName && Boolean(formik.errors.opportunityName)}
                helperText={formik.touched.opportunityName && formik.errors.opportunityName}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Enquiry Date"
                type="date"
                name="enqDate"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formik.values.enqDate}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.enqDate && Boolean(formik.errors.enqDate)}
                helperText={formik.touched.enqDate && formik.errors.enqDate}
              />


            </Grid>
            <Grid item xs={6}>
              <Autocomplete
                options={companyList}
                getOptionLabel={(opt) => opt?.companyName || ''}
                value={formik.values.contact}
                onInputChange={(e, val) => handleSearchContacts(val)}
                onChange={(e, val) => formik.setFieldValue('contact', val)}
                onBlur={() => formik.setFieldTouched('contact', true)}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Company"
                    size="small"
                    fullWidth
                    error={formik.touched.contact && Boolean(formik.errors.contact)}
                    helperText={formik.touched.contact && formik.errors.contact}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Reference Number"
                name="referenceNumber"
                fullWidth
                size="small"
                value={formik.values.referenceNumber}
                onChange={formik.handleChange}
              />
            </Grid>

           
            <Grid item xs={4}>
              <TextField
                label="Contact Name"
                name="contactPersonName"
                fullWidth
                size="small"
                value={formik.values.contactPersonName}
                onChange={formik.handleChange}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Phone"
                name="contactPersonPhone"
                fullWidth
                size="small"
                value={formik.values.contactPersonPhone}
                onChange={formik.handleChange}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Email"
                name="contactPersonEmail"
                fullWidth
                size="small"
                value={formik.values.contactPersonEmail}
                onChange={formik.handleChange}
              />
            </Grid>
             <Grid item xs={4}>
              <TextField
                label="Enquiry No"
                type="text"
                name="enqNo"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formik.values.enqNo}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.enqNo && Boolean(formik.errors.enqNo)}
                helperText={formik.touched.enqNo && formik.errors.enqNo}
                inputProps={{readOnly: true}}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Last Contacted"
                type="date"
                name="lastContactedDate"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formik.values.lastContactedDate}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.lastContactedDate && Boolean(formik.errors.lastContactedDate)}
                helperText={formik.touched.lastContactedDate && formik.errors.lastContactedDate}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Next Follow-up (days)"
                name="daysForNextFollowup"
                type="number"
                fullWidth
                size="small"
                value={formik.values.daysForNextFollowup}
                onChange={formik.handleChange}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Next Follow-up Date"
                type="date"
                name="nextFollowupDate"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formik.values.nextFollowupDate}
                onChange={formik.handleChange}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Follow-up Remarks"
                name="followupRemarks"
                fullWidth
                size="small"
                value={formik.values.followupRemarks}
                onChange={formik.handleChange}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Enquiry Source"
                name="enquirySource"
                fullWidth
                size="small"
                value={formik.values.enquirySource}
                onChange={formik.handleChange}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>Enquired Products</Typography>
          {formik.values.enquiredProducts.map((item, index) => (
            <Grid container spacing={2} key={index} alignItems="center" sx={{ mt: 1 }}>
              <Grid item xs={5}>
                <Autocomplete
                  freeSolo
                  options={productList}
                  getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt?.name || ''}
                  value={
                    formik.values.enquiredProducts[index].inventoryItem?.name ||
                    formik.values.enquiredProducts[index].productNameRequired ||
                    ''
                  }
                  onInputChange={(e, val, reason) => {
                    if (reason === 'input') {
                      formik.setFieldValue(`enquiredProducts[${index}].productNameRequired`, val);
                      handleSearchProducts(val);
                    }
                  }}
                  onChange={(e, val) => {
                    if (typeof val === 'string') {
                      // User entered a custom product name
                      formik.setFieldValue(`enquiredProducts[${index}].inventoryItem`, null);
                      formik.setFieldValue(`enquiredProducts[${index}].productNameRequired`, val);
                    } else if (val && typeof val === 'object') {
                      // User selected an existing product
                      formik.setFieldValue(`enquiredProducts[${index}].inventoryItem`, val);
                      formik.setFieldValue(`enquiredProducts[${index}].productNameRequired`, '');
                    } else {
                      // User cleared the selection
                      formik.setFieldValue(`enquiredProducts[${index}].inventoryItem`, null);
                      formik.setFieldValue(`enquiredProducts[${index}].productNameRequired`, '');
                    }
                  }}
                  isOptionEqualToValue={(o, v) => o?.id === v?.id || o?.name === v?.name}
                  renderInput={(params) => (
                    <TextField {...params} label="Product" size="small" fullWidth />
                  )}
                />

              </Grid>
              <Grid item xs={2}>
                <TextField
                  label="Qty"
                  name={`enquiredProducts[${index}].qty`}
                  type="number"
                  size="small"
                  value={item.qty}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Instructions"
                  name={`enquiredProducts[${index}].specialInstruction`}
                  size="small"
                  fullWidth
                  value={item.specialInstruction}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={1}>
                <Button color="error" onClick={() => removeProduct(index)}>X</Button>
              </Grid>
            </Grid>
          ))}
          <Button variant="outlined" onClick={addProduct} sx={{ mt: 2 }}>+ Add Product</Button>

          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>Conversation Records</Typography>
          {formik.values.enquiryConversationRecords.map((item, index) => (
            <Grid container spacing={2} key={index} alignItems="center" sx={{ mt: 1 }}>
              <Grid item xs={11}>
                <TextField
                  label="Conversation"
                  name={`enquiryConversationRecords[${index}].conversation`}
                  size="small"
                  fullWidth
                  value={item.conversation}
                  onChange={formik.handleChange}
                />
              </Grid>
              <Grid item xs={1}>
                <Button color="error" onClick={() => removeConversation(index)}>X</Button>
              </Grid>
            </Grid>
          ))}
          <Button variant="outlined" onClick={addConversation} sx={{ mt: 2 }}>+ Add Conversation</Button>


          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>Closure Details</Typography>

          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                select
                label="Status"
                name="status"
                fullWidth
                size="small"
                value={formik.values.status}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.status && Boolean(formik.errors.status)}
                helperText={formik.touched.status && formik.errors.status}
                SelectProps={{ native: true }}
              >
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="FOLLOW_UP">FOLLOW UP</option>
                <option value="CONVERTED">CONVERTED</option>
                <option value="LOST">LOST</option>
                <option value="CLOSED">CLOSED</option>
              </TextField>
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="Closed Date"
                type="date"
                name="closedDate"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formik.values.closedDate}
                onChange={formik.handleChange}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                label="Close Reason"
                name="closeReason"
                fullWidth
                size="small"
                value={formik.values.closeReason}
                onChange={formik.handleChange}
              />
            </Grid>
          </Grid>

          <Box mt={4}>
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Save Enquiry
            </Button>
          </Box>
        </CardContent>
      </Card>
    </form>
  );
};

export default AddUpdateEnquiry;
