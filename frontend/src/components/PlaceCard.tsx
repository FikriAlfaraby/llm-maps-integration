import React from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Rating,
} from "@mui/material";
import DirectionsIcon from "@mui/icons-material/Directions";
import MapIcon from "@mui/icons-material/Map";
import { Place } from "../types";

interface PlaceCardProps {
  place: Place;
  index: number;
  onShowDetails?: (place: Place) => void;
}

const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  index,
  onShowDetails,
}) => {
  return (
    <Card
      elevation={2}
      sx={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "primary.main",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              mr: 2,
              flexShrink: 0,
            }}
          >
            {index + 1}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              {place.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {place.address}
            </Typography>
          </Box>
        </Box>

        {place.rating && (
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Rating
              value={place.rating}
              readOnly
              precision={0.1}
              size="small"
            />
            <Typography variant="body2" sx={{ ml: 1 }}>
              {place.rating} ({place.user_ratings_total || 0} reviews)
            </Typography>
          </Box>
        )}

        {place.open_now !== null && (
          <Chip
            label={place.open_now ? "Open Now" : "Closed"}
            color={place.open_now ? "success" : "error"}
            size="small"
            sx={{ mb: 1 }}
          />
        )}

        {place.price_level && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            Price: {"$".repeat(place.price_level)}
          </Typography>
        )}
      </CardContent>

      <CardActions>
        <Button
          size="small"
          startIcon={<MapIcon />}
          href={place.maps_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View on Maps
        </Button>
        <Button
          size="small"
          startIcon={<DirectionsIcon />}
          href={place.directions_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Directions
        </Button>
      </CardActions>
    </Card>
  );
};

export default PlaceCard;
