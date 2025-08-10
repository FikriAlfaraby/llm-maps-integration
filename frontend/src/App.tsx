// frontend/src/App.tsx
import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Paper,
  Typography,
  Alert,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Button,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MapIcon from "@mui/icons-material/Map";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import SearchForm from "./components/SearchForm";
import PlaceCard from "./components/PlaceCard";
import MapView from "./components/MapView";
import { QueryRequest, QueryResponse } from "./types";
import api from "./services/api";

function App() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    // Check API health on mount
    api.healthCheck().catch(() => {
      toast.error(
        "Backend API is not responding. Please ensure the server is running."
      );
    });

    // Try to get user location
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          toast.success("Location obtained successfully!");
        },
        (error) => {
          console.error("Failed to get location:", error);
        },
        { timeout: 5000 }
      );
    }
  };

  const handleSearch = async (request: QueryRequest) => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.queryPlaces(request);
      setResponse(data);

      if (data.cached) {
        toast.info("Results loaded from cache");
      }

      if (data.places.length === 0) {
        toast.warning("No places found for your query");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || "Failed to process your request";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const requestUserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          toast.success("Location updated successfully!");
        },
        (error) => {
          toast.error("Could not get your location. Please check permissions.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <MapIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            LLM Maps Integration
          </Typography>
          <Button
            color="inherit"
            startIcon={<LocationOnIcon />}
            onClick={requestUserLocation}
            sx={{
              color: userLocation ? "success.light" : "inherit",
            }}
          >
            {userLocation ? "Location Set" : "Use My Location"}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Search Form */}
          <Grid size={{ xs: 12 }}>
            <SearchForm
              onSearch={handleSearch}
              loading={loading}
              userLocation={userLocation}
            />
          </Grid>

          {/* Error Alert */}
          {error && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            </Grid>
          )}

          {/* Results */}
          {response && (
            <>
              {/* LLM Response */}
              <Grid size={{ xs: 12 }}>
                <Paper elevation={3} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    AI Recommendations
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {response.llm_text}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Request ID: {response.request_id} | Processing time:{" "}
                      {response.processing_time}ms |
                      {response.cached ? "Cached" : "Fresh"}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* Places Grid */}
              {response.places.length > 0 && (
                <>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="h5" gutterBottom>
                      Found Places
                    </Typography>
                  </Grid>
                  {response.places.map((place, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={place.place_id}>
                      <PlaceCard place={place} index={index} />
                    </Grid>
                  ))}

                  {/* Map View */}
                  <Grid size={{ xs: 12 }}>
                    <MapView places={response.places} />
                  </Grid>
                </>
              )}
            </>
          )}
        </Grid>
      </Container>

      <ToastContainer position="bottom-right" />
    </>
  );
}

export default App;
