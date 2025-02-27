import React, { useState, useEffect } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useNavigate, useParams} from 'react-router-dom';
import apiService from '../../services/apiService';
import './style/InventoryItem.css';
import {DeleteOutline, PictureAsPdf, UploadFile} from "@mui/icons-material";
import {FileSpreadsheet} from "lucide-react";
import apiFile from "../../services/apiService";

const AddInventoryItem = () => {
    const { id } = useParams(); // Fetch item ID from URL params for edit
    const navigate = useNavigate();
    const [itemData, setItemData] = useState({
        itemCode: '',
        name: '',
        hsnCode: '',
        uom: 'NOS',
        itemType: 'RAW_MATERIAL',
        dimension: '',
        size1: '',
        size2: '',
        revision: 1,
        remarks: '',
        basicMaterial: '',
        inventoryItemAttachmentList:[],
    });
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    useEffect(() => {
        if (id) {
            // If editing, fetch the item details
            const fetchItem = async () => {
                try {
                    const data = await apiService.get(`/inventory_item/${id}`);
                    setItemData(data);
                    setIsEditMode(true);
                } catch (error) {
                    console.error('Failed to fetch item details:', error);
                }
            };
            fetchItem();
        }
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setItemData({
            ...itemData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode) {
                await apiService.put(`/inventory_item/${id}`, itemData);
                alert('Item updated successfully!');

            } else {
                await apiService.post('/inventory_item/add', itemData);
                alert('Item added successfully!');
            }



            navigate(-1);

        } catch (error) {
            console.error('Error saving inventory item:', error);
            alert('Failed to save item. Please try again.');
        }
    };

    const downloadFile = async (index,filename)=>{
        await apiService.download(`/inventory_item/download/${index}`,'',filename);
        // alert('Item updated successfully!');
    }

    const deleteFile = async (index,filename)=>{
        await apiService.delete(`/inventory_item/delete/${index}`,'',filename);
        // alert('Item updated successfully!');
        navigate(0)
    }

    const uploadFile = async ()=>{
        if (!selectedFile) {
            alert("Please select a file first!");
            return;
        }
        await apiService.upload(`/inventory_item/${itemData.inventoryItemId}/upload`,selectedFile)
        navigate(0)
    }



    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]); // Store file in state
    };

    return (
        <Form onSubmit={handleSubmit} className="form-container">
            <h3>{isEditMode ? 'Edit Inventory Item' : 'Add Inventory Item'}</h3>

            <div className={"item-code"}>
                <div className="form-group-pair">
                    {/*<Form.Label>Item Code:</Form.Label>*/}
                    <h5>Item Code</h5>
                    <Form.Control
                        type="text"
                        name="itemCode"
                        value={itemData.itemCode}
                        onChange={handleInputChange}
                        placeholder={"Item Code"}
                        required
                        className={"item-code-input "}
                    />
                    <Button className="assign-button">Assign New</Button>
                </div>
            </div>
            {/* Item Name */}

            <div className={"basic-item-details"}>
                <h6 className={"section-heading"}>Basic Info</h6>

                <div className={"basic-info-input"}>
                    <div className={"basic-info-input-1"}>
                        <div className="item-dimension-input">
                            <input
                                type="text"
                                name="name"
                                value={itemData.name}
                                onChange={handleInputChange}
                                required
                                placeholder=""
                                className={"item-input"}
                            />
                            <label className={"input-label"}>Item Name</label>
                        </div>

                        <div className={"item-dimension-input right-input"}>
                            <input
                                type="text"
                                name="hsnCode"
                                value={itemData.hsnCode}
                                onChange={handleInputChange}
                                placeholder={""}
                                className={"item-input"}
                            />
                            <label className={"input-label"}>HSN Code</label>
                        </div>
                    </div>
                    <div className={"basic-info-input-2"}>
                        <div className="item-dimension-input">
                            <select
                                // type="select"
                                name="uom"
                                value={itemData.uom || 'NOS'}
                                onChange={handleInputChange}
                                className={"item-input"}
                                // placeholder={"UOM"}
                            >
                                <option value="NOS">Nos.</option>
                                <option value="KG">Kg</option>
                                <option value="METER">Meter</option>
                                <option value="INCH">Inch</option>
                            </select>
                            <label className={"input-label"}>UOM</label>
                        </div>
                        <div className={"item-dimension-input right-input"}>
                            <select

                                name="itemType"
                                value={itemData.itemType || 'RAW_MATERIAL'}
                                onChange={handleInputChange}
                                className={"item-input "}
                            >
                                <option value="RAW_MATERIAL">Raw Material</option>
                                <option value="ASSEMBLY">Assembly</option>
                                <option value="FINISHED_GOOD">Finished Good</option>
                            </select>
                            <label className={"input-label"}>Type</label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Revision */}
            <div className={"basic-item-details"}>

                <h6 className={"section-heading"}>Specifications</h6>
                <div className={"basic-info-input"}>
                    <div className={"basic-info-input-1"}>
                        <div className="item-dimension-input ">

                            <input
                                type="text"
                                name="dimension"
                                value={itemData.dimension}
                                onChange={handleInputChange}
                                placeholder={""}
                                className={"item-input"}
                            />
                            <label className={"input-label"}>Dimensions</label>
                        </div>


                        <div className="item-dimension-input right-input">
                            <input
                                type="text"
                                name="size1"
                                value={itemData.size1}
                                onChange={handleInputChange}
                                placeholder={""}
                                className={"item-input"}
                            />
                            <label className={"input-label"}>Size 1</label>
                        </div>
                    </div>

                    <div className={"basic-info-input-2"}>
                        <div className="item-dimension-input ">
                            <input
                                type="text"
                                name="size2"
                                value={itemData.size2}
                                onChange={handleInputChange}
                                placeholder={""}
                                className={"item-input"}
                            />
                            <label className={"input-label"}>Size 2</label>
                        </div>
                        <div className={"item-dimension-input right-input"}>
                            <input
                                type="text"
                                name="basicMaterial"
                                value={itemData.basicMaterial}
                                onChange={handleInputChange}
                                placeholder={""}
                                className={"item-input"}
                            />
                            <label className={"input-label"}>Basic Material</label>
                        </div>


                    </div>
                </div>
            </div>


            <div className={"basic-item-details"}>

                <h6 className={"section-heading"}>Specifications</h6>
                <div className={"basic-info-input"}>
                    <div className={"basic-info-input-1"}>
                        <div className={"item-dimension-input "}>
                            <input
                                type="text"
                                name="revision"
                                value={itemData.revision}
                                onChange={handleInputChange}
                                className={"item-input"}
                            />
                            <label className={"input-label"}>Revision</label>
                        </div>

                        {/* Remarks */}
                        <div className="item-dimension-input right-input">

                            <input
                                type="text"
                                name="remarks"
                                value={itemData.remarks}
                                onChange={handleInputChange}
                                className={"item-input"}
                                placeholder={""}
                            />
                            <label className={"input-label"}>Remarks</label>
                        </div>
                    </div>
                </div>


            </div>

            {isEditMode&&
            <div className={"basic-item-details"}>
                <h6 className={"section-heading"}>Attachments</h6>
                <div className={"basic-info-input"}>
                    {itemData.inventoryItemAttachmentList.map((item, index) => (
                        <div key={index} className={"attachment-box"}>
                            <span className={"file-link"} onClick={() => {
                                downloadFile(item.id, item.fileName)
                            }}>{item.fileName}</span>
                            <DeleteOutline style={{"float": "right"}} onClick={() => {
                                deleteFile(item.id, item.fileName)
                            }}/>
                        </div>

                    ))}


                    <div className="attachment-container"
                         style={{display: "flex", alignItems: "center"}}>
                        <div className="attachment-box" style={{marginRight: "10px"}}>
                            <input type="file" className="file-input" onChange={handleFileChange}/>
                        </div>
                        <Button className="upload-button" style={{cursor: "pointer"}} onClick={()=>uploadFile()}>Upload</Button>
                    </div>


                </div>
            </div>
            }
            <Button variant="primary" type="submit" className="submit-btn">
                {isEditMode ? 'Update Item' : 'Add Item'}
            </Button>
        </Form>
    );
};

export default AddInventoryItem;
