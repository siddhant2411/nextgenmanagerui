import React, { useState, useRef } from "react";
import {
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import { CloudUpload, PictureAsPdf, Delete } from "@mui/icons-material";
const PDFUploadBox = ({handleChange,pdfFiles,setPdfFiles}) => {
    // const [pdfFiles, setPdfFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef();

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        const validFiles = files.filter((f) => f.type === "application/pdf");
        const newFiles = validFiles.map((file) => ({
            name: file.name,
            url: URL.createObjectURL(file),
            file:file,
        }));
        setPdfFiles((prev) => [...prev, ...newFiles]);
        handleChange(e)
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files || []);
        const validFiles = files.filter((f) => f.type === "application/pdf");
        const newFiles = validFiles.map((file) => ({
            name: file.name,
            url: URL.createObjectURL(file),
        }));
        setPdfFiles((prev) => [...prev, ...newFiles]);
    };

    const removeFile = (index) => {
        const updated = pdfFiles.filter((_, i) => i !== index);
        setPdfFiles(updated);
        // if (selecte === images[index]) setSelectedImage(updated[0] || null);
    };

    return (
        <Box
            width="100%"
            maxWidth="320px"
            pl="30px"
            display="flex"
            flexDirection="column"
            alignItems="center"
            height="300px"
        >
            {/* Upload Box */}
            <Box
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current.click()}
                sx={{
                    border: isDragging ? "2px solid #1976d2" : "2px dashed #ccc",
                    borderRadius: 2,
                    height: 80,
                    width: "100%",
                    backgroundColor: isDragging ? "#e3f2fd" : "#fafafa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    cursor: "pointer",
                    transition: "0.3s ease",
                    "&:hover": { borderColor: "#1976d2", backgroundColor: "#f5f9ff" },
                }}
            >
                <CloudUpload sx={{ fontSize: 38, color: "#888" }} />
                <Typography variant="body2" sx={{ mt: 1, color: "#666", textAlign: "center" }}>
                    Click or drag PDFs to upload
                </Typography>
                <input
                    ref={inputRef}
                    type="file"
                    hidden
                    multiple
                    accept="application/pdf"
                    onChange={handleFileChange}
                />
            </Box>

            {/* Uploaded Files List */}
            {pdfFiles.length > 0 && (
                <Box
                    sx={{
                        width: "100%",
                        mt: 2,
                        border: "1px solid #ddd",
                        borderRadius: 2,
                        p: 1,
                        backgroundColor: "#fafafa",
                        height: 150,          // fixed height
                        overflowY: "auto",    // scrollable
                    }}
                >
                    <List dense disablePadding>
                        {pdfFiles.map((file, index) => (
                            <ListItem
                                key={index}
                                sx={{
                                    borderRadius: 1,
                                    mb: 0.5,
                                    py: 0.3,
                                    px: 1,
                                    bgcolor: "#fff",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                    "&:hover": { bgcolor: "#f1faff" },
                                }}
                                secondaryAction={
                                    <IconButton edge="end" onClick={() => removeFile(index)}>
                                        <Delete sx={{ color: "#f44336", fontSize: 20 }} />
                                    </IconButton>
                                }
                            >
                                <ListItemIcon sx={{ minWidth: 30 }}>
                                    <PictureAsPdf sx={{ color: "#d32f2f", fontSize: 22 }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                cursor: "pointer",
                                                textDecoration: "underline",
                                                "&:hover": { color: "#1976d2" },
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                maxWidth: "200px",
                                            }}
                                            onClick={() => window.open(file.url, "_blank")}
                                        >
                                            {file.originalName || file.name}
                                        </Typography>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}
        </Box>
    );
};

export default PDFUploadBox;
