import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
} from "@mui/material";
import { CloudUpload, AddPhotoAlternate } from "@mui/icons-material";

const ImageUploadBox = ({ handleChange, images, setImages }) => {

  const [selectedImage, setSelectedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef();

  const handleFiles = (files) => {
    const newFiles = Array.from(files);

    // Convert to objects containing both file and preview URL
    const newFileObjects = newFiles
      .slice(0, 3 - images.length)
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

    // Merge with existing ones (limit to 3)
    const updatedImages = [...images, ...newFileObjects].slice(0, 3);

    setImages(updatedImages);

    // If none selected, set the first one
    if (!selectedImage && updatedImages.length > 0) {
      setSelectedImage(updatedImages[0].preview);
    }
  };

  const handleFileChange = (e) => {
    handleChange(e)
    const files = e.target.files;
    if (files && files.length > 0) handleFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleFiles(files);
  };

  const removeImage = (index) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    if (selectedImage === images[index]) setSelectedImage(updated[0] || null);
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
      
      <Box
        onDragOver={!images.length ? handleDragOver : undefined}
        onDragLeave={!images.length ? handleDragLeave : undefined}
        onDrop={!images.length ? handleDrop : undefined}
        onClick={!images.length ? () => inputRef.current.click() : undefined}
        sx={{
          border: isDragging ? "2px solid #1976d2" : "2px dashed #ccc",
          borderRadius: 2,
          height: 220,
          width: "100%",
          backgroundColor: isDragging ? "#e3f2fd" : "#fafafa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          overflow: "hidden",
          cursor: images.length ? "default" : "pointer",
          transition: "0.3s ease",
          "&:hover": !images.length && {
            borderColor: "#1976d2",
            backgroundColor: "#f5f9ff",
          },
        }}
      >
        {selectedImage ? (
          <Box
            component="img"
            src={selectedImage}
            alt="Selected"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain", // ensures full image fits inside
              cursor: "pointer",
              backgroundColor: "#fff",
            }}
            onClick={() => window.open(selectedImage, "_blank")} // opens image in new tab
          />
        ) : (
          <>
            <CloudUpload sx={{ fontSize: 48, color: "#999" }} />
            <Typography variant="body2" sx={{ color: "#777", mt: 1 }}>
              Click or drag up to 3 images to upload
            </Typography>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/*"
          multiple
          onChange={
            handleFileChange
          }
          name="imageInput"
        />
      </Box>

      {images.length > 0 && (
        <Box
          mt={1.5}
          display="flex"
          justifyContent="center"
          gap={1}
          flexWrap="wrap"
          alignItems="center"
        >
          {images.map((img, index) => {
            const src = img.preview || img.presignedUrl;
          

            return (
              <Box
                key={index}
                sx={{
                  position: "relative",
                  border: src === selectedImage ? "2px solid #1976d2" : "2px solid transparent",
                  borderRadius: 1,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "0.2s",
                  "&:hover": { opacity: 0.85 },
                }}
                onClick={() => setSelectedImage(src)}
              >
                <Box
                  component="img"
                  src={src}
                  alt={`Uploaded ${index}`}
                  sx={{
                    width: 60,
                    height: 60,
                    objectFit: "cover",
                    borderRadius: 1,
                  }}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    fontSize: 10,
                    minWidth: "unset",
                    padding: 0.5,
                  }}
                >
                  ×
                </Button>
              </Box>
            );
          })}


          {images.length < 3 && (
            <IconButton
              color="primary"
              onClick={() => inputRef.current.click()}
              sx={{
                width: 60,
                height: 60,
                border: "1px dashed #1976d2",
                borderRadius: 1,
                backgroundColor: "#f5f9ff",
                "&:hover": { backgroundColor: "#e3f2fd" },
              }}
            >
              <AddPhotoAlternate fontSize="medium" />
            </IconButton>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ImageUploadBox;
