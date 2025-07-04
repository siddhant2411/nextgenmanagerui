import { TextField, Grid, Box, Typography } from '@mui/material'

import React, { useEffect } from 'react'

export default function WorkOrderTemplate({ formik, selectedTab }) {

    useEffect(() => {
        let totalEstimatedHours = 0;
        let totalEstimatedCostOfLabour = 0;
        let totalItemCost = 0;

        formik.values.productionTemplate?.workOrderJobLists?.forEach((job) => {
            totalEstimatedHours += Number(job.numberOfHours);
            totalEstimatedCostOfLabour += Number(job.productionJob.costPerHour);
        });

        formik.values.components?.forEach((item) => {
            totalItemCost += Number(item.standardCost) * Number(item.quantity);
        });

        const estimatedCostOfLabour = totalEstimatedHours * totalEstimatedCostOfLabour;
        const estimatedCostOfBom = totalItemCost;
        const overheadPercentage = Number(formik.values.productionTemplate?.overheadCostPercentage || 0);

        const overheadCostValue = (estimatedCostOfLabour + estimatedCostOfBom) * (overheadPercentage / 100);
        const totalCostOfWorkOrder = estimatedCostOfLabour + estimatedCostOfBom + overheadCostValue;

        formik.setFieldValue('productionTemplate.estimatedHours', totalEstimatedHours);
        formik.setFieldValue('productionTemplate.estimatedCostOfLabour', estimatedCostOfLabour);
        formik.setFieldValue('productionTemplate.estimatedCostOfBom', estimatedCostOfBom);
        formik.setFieldValue('productionTemplate.overheadCostValue', overheadCostValue);
        formik.setFieldValue('productionTemplate.totalCostOfWorkOrder', totalCostOfWorkOrder);
    }, [
        formik.values.productionTemplate?.workOrderJobLists,
        formik.values.components,
        formik.values.productionTemplate?.overheadCostPercentage
    ]);

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Operations</Typography>
            < Grid container spacing={2}>
                <Grid item xs={6}>
                    <TextField
                        label="Estimated Hours"
                        fullWidth
                        size="small"
                        value={formik.values.productionTemplate?.estimatedHours}
                        onChange={(e) => formik.setFieldValue('productionTemplate.estimatedHours', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        label="Estimated Operation Cost"
                        fullWidth
                        size="small"
                        value={formik.values.productionTemplate?.estimatedCostOfLabour}
                        onChange={(e) => formik.setFieldValue('productionTemplate.estimatedCostOfLabour', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        label="Estimated BOM Cost"
                        fullWidth
                        size="small"
                        value={formik.values.productionTemplate?.estimatedCostOfBom}
                        onChange={(e) => formik.setFieldValue('productionTemplate.estimatedCostOfBom', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        label="Overhead %"
                        fullWidth
                        size="small"
                        value={formik.values.productionTemplate?.overheadCostPercentage}
                        onChange={(e) => formik.setFieldValue('productionTemplate.overheadCostPercentage', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        label="Overhead Value"
                        fullWidth
                        size="small"
                        value={formik.values.productionTemplate?.overheadCostValue}
                        onChange={(e) => formik.setFieldValue('productionTemplate.overheadCostValue', e.target.value)}
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextField
                        label="Total Cost"
                        fullWidth
                        size="small"
                        value={formik.values.productionTemplate?.totalCostOfWorkOrder}
                        onChange={(e) => formik.setFieldValue('productionTemplate.totalCostOfWorkOrder', e.target.value)}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        label="Details"
                        fullWidth
                        multiline
                        rows={3}
                        size="small"
                        value={formik.values.productionTemplate?.details}
                        onChange={(e) => formik.setFieldValue('productionTemplate.details', e.target.value)}
                    />
                </Grid>
            </Grid>
        </Box>
    )
}
