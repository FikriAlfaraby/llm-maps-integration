import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { Place } from "../types";

interface MapViewProps {
  places: Place[];
}

const MapView: React.FC<MapViewProps> = ({ places }) => {
  if (!places || places.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, height: 400 }}>
        <Typography variant="h6" gutterBottom>
          Map View
        </Typography>
        <Box
          sx={{
            height: 350,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "grey.200",
            borderRadius: 1,
          }}
        >
          <Typography color="text.secondary">
            No places to display on map
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Use the first place's embed URL
  const embedUrl = places[0].embed_url;

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Map View
      </Typography>
      <Box sx={{ height: 400, borderRadius: 1, overflow: "hidden" }}>
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </Box>
    </Paper>
  );
};

export default MapView;
