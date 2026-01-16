import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import DownloadIcon from "@mui/icons-material/Download";
import api from "../api";

export default function ImportRestaurantsPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === "text/xml" || selectedFile.name.endsWith(".xml"))) {
      setFile(selectedFile);
      setError("");
      setResult(null);
    } else {
      setFile(null);
      setError("Please select a valid XML file");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an XML file first");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/restaurants/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setResult(res.data);
    } catch (err) {
      console.error("Import error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to import restaurants. Please check the file format."
      );
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `<?xml version="1.0" encoding="UTF-8"?>
<restaurants>
  <restaurant>
    <name>Pizza Napolitana</name>
    <business_address>Str. Victoriei 15, București</business_address>
    <email>contact@pizza.ro</email>
    <type>Italian</type>
    <price_level>2</price_level>
    <rating>4.5</rating>
    <badges>
      <badge>pizza</badge>
      <badge>italian</badge>
    </badges>
    <lat>44.439663</lat>
    <lng>26.096306</lng>
    <place_id>ChIJexampleid1</place_id>
    <images>
      <image>https://example.com/img1.jpg</image>
    </images>
    <allergy_filter>
      <allergy>gluten</allergy>
    </allergy_filter>
  </restaurant>
  <restaurant>
    <name>Sushi Master</name>
    <business_address>Bd. Magheru 28, București</business_address>
    <email>info@sushi.ro</email>
    <type>Japanese</type>
    <price_level>3</price_level>
    <rating>4.8</rating>
    <badges>
      <badge>sushi</badge>
      <badge>asian</badge>
      <badge>seafood</badge>
    </badges>
    <lat>44.439876</lat>
    <lng>26.097521</lng>
    <place_id>ChIJexampleid2</place_id>
    <images>
      <image>https://example.com/img2.jpg</image>
    </images>
    <allergy_filter>
      <allergy>seafood</allergy>
    </allergy_filter>
  </restaurant>
  <restaurant>
    <name>Burger House</name>
    <business_address>Str. Lipscani 45, București</business_address>
    <email>hello@burger.ro</email>
    <type>American</type>
    <price_level>2</price_level>
    <rating>4.2</rating>
    <badges>
      <badge>burger</badge>
      <badge>fast-food</badge>
    </badges>
    <lat>44.432098</lat>
    <lng>26.101234</lng>
    <place_id>ChIJexampleid3</place_id>
    <images>
      <image>https://example.com/img3.jpg</image>
    </images>
    <allergy_filter>
      <allergy>gluten</allergy>
      <allergy>dairy</allergy>
    </allergy_filter>
  </restaurant>
</restaurants>`;

    const blob = new Blob([template], { type: "text/xml;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "restaurants_import_template.xml";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 5 }}>
      <Typography variant="h4" gutterBottom>
        Import Restaurants (XML)
      </Typography>
      <Typography variant="body2" color="textSecondary" mb={3}>
        Upload an XML file to import multiple restaurants at once. All imported
        restaurants will have "pending" status and require admin approval.
      </Typography>

      <Paper sx={{ p: 4, mb: 3, borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h6" mb={2}>
          XML Template
        </Typography>
        <Typography variant="body2" mb={2}>
          Download the template below to see the required format and structure.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={downloadTemplate}
        >
          Download XML Template
        </Button>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" mb={2}>
          Upload XML File
        </Typography>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
          <Button variant="contained" component="label" startIcon={<CloudUploadIcon />}>
            Choose File
            <input
              type="file"
              hidden
              accept=".xml"
              onChange={handleFileChange}
            />
          </Button>
          {file && (
            <Typography variant="body2" color="textSecondary">
              {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </Typography>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={!file || uploading}
          startIcon={uploading ? <CircularProgress size={18} /> : <CloudUploadIcon />}
        >
          {uploading ? "Uploading..." : "Import Restaurants"}
        </Button>
      </Paper>

      {result && (
        <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="h6" mb={3}>
            Import Results
          </Typography>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6}>
              <Card sx={{ backgroundColor: "#e8f5e9" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckCircleIcon color="success" />
                    <Typography variant="h4" color="success.main">
                      {result.success}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Successfully Imported
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card sx={{ backgroundColor: "#ffebee" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ErrorIcon color="error" />
                    <Typography variant="h4" color="error.main">
                      {result.failed}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Failed to Import
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {result.failed > 0 && result.errors && result.errors.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" mb={2} color="error">
                Import Errors ({result.errors.length})
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Row</TableCell>
                      <TableCell>Restaurant Name</TableCell>
                      <TableCell>Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.errors.map((err, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Chip label={`Row ${err.row}`} size="small" />
                        </TableCell>
                        <TableCell>
                          {err.data?.name || <em>(empty name)</em>}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="error">
                            {err.error}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {result.success > 0 && (
            <Alert severity="info" sx={{ mt: 3 }}>
              {result.success} restaurant(s) imported successfully with
              "pending" status. Review them in the Restaurants page.
            </Alert>
          )}
        </Paper>
      )}

    </Box>
  );
}
