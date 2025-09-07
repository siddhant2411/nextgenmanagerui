import {
  Card, CardHeader, CardContent, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody,
  TextField, Tooltip,
  Autocomplete
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import Warning from '@mui/icons-material/Warning';
import { useRef, useState } from 'react';
import { inventoryItemSearch } from '../../../services/commonAPI';
import AddItemDialog from './AddItemDialog';

const SalesOrderItemsTable = ({ items, setItems }) => {
  const handleChange = (idx, field, value) => {
    const newItems = [...items];
    newItems[idx][field] = value;
    setItems(newItems);
  };
  const [openAddDialog, setOpenAddDialog] = useState(false);


  return (
    <Card sx={{ mt: 2 }}>
      <CardHeader
        title="Order Line Items"
        titleTypographyProps={{ fontSize: 14 }}
        action={
          <IconButton size="small" onClick={() => setOpenAddDialog(true)}>
            <AddIcon fontSize="small" />
          </IconButton>
        }
        sx={{ pb: 0.5, '& .MuiCardHeader-title': { fontSize: 16 } }}
      />
      <CardContent sx={{ pt: 1, pb: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['S.No', 'Item Code', 'Item Name', 'HSN', 'Dimension', 'Qty', 'Price','Discount% (Internal) ', 'Unit Price','Total Value', ''].map((h, hIdx) =>
                <TableCell
                  key={hIdx}
                  sx={{ fontSize: 13, py: 0.5, px: 1 }}
                  padding="none"
                  style={{ textAlign: "center" }}
                >{h}</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {items?.map((item, idx) => (
              <TableRow key={idx} sx={{ height: 40 }}>
                <TableCell sx={{ fontSize: 12, py: 0.3, px: 1 }} padding="none" style={{ textAlign: "center" }}>
                  {idx + 1}
                  {item?.inventoryItem == null && (
                    <Tooltip title="Please Create Product">
                      <Warning fontSize="small" color="warning" sx={{ ml: 0.5 }} />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell sx={{ py: 0.3, px: 1 }} padding="none">
                  <TextField
                    size="small"
                    margin="dense"
                    value={item?.inventoryItem?.itemCode || ''}
                    inputProps={{ style: { fontSize: 12, padding: 6, height: 20 } }}
                    fullWidth
                  />
                </TableCell>



                <TableCell sx={{ py: 0.3, px: 1 }} padding="none">
                  <TextField
                    size="small"
                    margin="dense"
                    value={item?.inventoryItem?.name || item?.productNameRequired || ''}
                    inputProps={{ style: { fontSize: 12, padding: 6, height: 20 } }}
                    fullWidth
                  />
                </TableCell>
                <TableCell sx={{ py: 0.3, px: 1 }} padding="none" style={{ width: "10%" }}>
                  <TextField
                    size="small"
                    margin="dense"
                    value={item?.inventoryItem?.hsnCode || item?.hsnCode || ''}
                    onChange={e => handleChange(idx, 'hsnCode', e.target.value)}
                    inputProps={{ style: { fontSize: 12, padding: 6, height: 20 } }}
                    fullWidth
                  />
                </TableCell>
                <TableCell sx={{ py: 0.3, px: 1 }} padding="none">
                  <TextField
                    size="small"
                    margin="dense"
                    value={item?.inventoryItem?.dimension || ''}
                    // onChange={e => handleChange(idx, 'discountPercentage', e.target.value)}
                    inputProps={{ style: { fontSize: 12, padding: 6, height: 20 } }}
                    fullWidth
                  />
                </TableCell>
                <TableCell sx={{ py: 0.3, px: 1 }} padding="none" style={{ width: "5%" }}>
                  <TextField
                    size="small"
                    margin="dense"
                    type="number"
                    value={item?.qty || ''}
                    onChange={e => handleChange(idx, 'qty', e.target.value)}
                    inputProps={{ style: { fontSize: 12, padding: 6, height: 20 } }}
                    fullWidth
                  />
                </TableCell>

                <TableCell sx={{ py: 0.3, px: 1 }} padding="none" style={{ width: "10%" }}>
                  <TextField
                    size="small"
                    margin="dense"
                    type="number"
                    value={item.pricePerUnit || 0}
                    onChange={e => handleChange(idx, 'pricePerUnit', e.target.value)}
                    inputProps={{ style: { fontSize: 12, padding: 6, height: 20 } }}
                    fullWidth
                  />
                </TableCell>

                <TableCell sx={{ py: 0.3, px: 1 }} padding="none" style={{ width: "10%" }}>
                  <TextField
                    size="small"
                    margin="dense"
                    type="number"
                    value={item.discountPercentage || 0}
                    onChange={e => handleChange(idx, 'discountPercentage', e.target.value)}
                    inputProps={{ style: { fontSize: 12, padding: 6, height: 20 } }}
                    fullWidth
                  />
                </TableCell>

                <TableCell sx={{ py: 0.3, px: 1 }} padding="none" style={{ width: "10%" }}>
                  <TextField
                    size="small"
                    margin="dense"
                    type="number"
                    value={item.pricePerUnit- (item.pricePerUnit* item.discountPercentage/100) || 0}
                   
                    inputProps={{ style: { fontSize: 12, padding: 6, height: 20 } }}
                    fullWidth
                  />
                </TableCell>

                <TableCell sx={{ py: 0.3, px: 1 }} padding="none" style={{ width: "10%" }}>
                  <TextField
                    size="small"
                    margin="dense"
                    type="number"
                    value={((item?.pricePerUnit ?? 0) * (item?.qty ?? 0) - ((item?.pricePerUnit ?? 0) * (item?.qty ?? 0)) * ((item?.discountPercentage ?? 0) / 100)) || 0}
                    aria-readonly
                    inputProps={{ style: { fontSize: 12, padding: 6, height: 20 } }}
                    fullWidth
                  />
                </TableCell>
                <TableCell sx={{ py: 0.3, px: 1 }} padding="none">
                  <IconButton
                    size="small"
                    onClick={() => setItems(items.filter((_, ix) => ix !== idx))}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            <AddItemDialog
              open={openAddDialog}
              onClose={() => setOpenAddDialog(false)}
              onSave={(newItem) => {
                setItems([...items, newItem]);   // push new item
                setOpenAddDialog(false);
              }}
            />
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SalesOrderItemsTable;
