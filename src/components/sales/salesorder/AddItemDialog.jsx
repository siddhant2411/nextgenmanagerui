import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import { inventoryItemSearch } from "../../../services/commonAPI";

export default function AddItemDialog({ open, onClose, onSave }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [productList, setProductList] = useState([]);
  const debounceTimeout = useRef(null);

  const handleSave = () => {
    if (!selectedProduct) return;

    // Call parent callback instead of managing items here
    onSave({
      inventoryItem: selectedProduct,
      qty: Number(qty) || 0,
      pricePerUnit: Number(unitPrice) || 0,
      discountPercentage:0
    });

    // reset local states
    setSelectedProduct(null);
    setQty("");
    setUnitPrice("");
  };

  const handleSearchProducts = (query) => {
    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(async () => {
      const result = await inventoryItemSearch(query);
      setProductList(result);
    }, 500);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Item</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Autocomplete
              options={productList}
              getOptionLabel={(opt) => opt?.itemCode || ""}
              value={selectedProduct}
              onChange={(e, val) => setSelectedProduct(val)}
              onInputChange={(e, val, reason) => {
                if (reason === "input") handleSearchProducts(val);
              }}
              isOptionEqualToValue={(o, v) => o?.id === v?.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Item Code"
                  size="small"
                  fullWidth
                />
              )}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Quantity"
              size="small"
              fullWidth
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Unit Price"
              size="small"
              fullWidth
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
