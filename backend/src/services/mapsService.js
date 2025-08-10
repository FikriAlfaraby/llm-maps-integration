// backend/src/services/mapsService.js
const { Client } = require("@googlemaps/google-maps-services-js");
const config = require("../config/config");
const logger = require("../utils/logger");

class MapsService {
  constructor() {
    this.client = new Client({});
    this.apiKey = config.googleMaps.apiKey;
  }

  async searchPlaces(query, location = null, radius = null, placeType = null) {
    try {
      const params = {
        key: this.apiKey,
        query,
        language: config.googleMaps.defaultLanguage,
        region: config.googleMaps.defaultRegion,
      };

      if (location) {
        params.location = location;
      } else {
        params.location = config.googleMaps.defaultLocation;
      }

      if (radius) {
        params.radius = radius;
      } else {
        params.radius = config.googleMaps.searchRadius;
      }

      if (placeType) {
        params.type = placeType;
      }

      const response = await this.client.textSearch({ params });

      const places = response.data.results
        .slice(0, 5)
        .map((place) => this.formatPlace(place));

      logger.info(`Found ${places.length} places for query: ${query}`);
      return places;
    } catch (error) {
      logger.error("Places search failed:", error);
      return [];
    }
  }

  async getPlaceDetails(placeId) {
    try {
      const response = await this.client.placeDetails({
        params: {
          key: this.apiKey,
          place_id: placeId,
          fields: [
            "name",
            "formatted_address",
            "geometry",
            "rating",
            "opening_hours",
            "formatted_phone_number",
            "website",
            "photos",
            "reviews",
            "types",
          ],
          language: config.googleMaps.defaultLanguage,
        },
      });

      if (response.data.result) {
        return this.formatPlaceDetails(response.data.result);
      }

      return null;
    } catch (error) {
      logger.error("Failed to get place details:", error);
      return null;
    }
  }

  async nearbySearch(location, placeType, radius = 1000, keyword = null) {
    try {
      const params = {
        key: this.apiKey,
        location,
        radius,
        type: placeType,
        language: config.googleMaps.defaultLanguage,
      };

      if (keyword) {
        params.keyword = keyword;
      }

      const response = await this.client.placesNearby({ params });

      const places = response.data.results
        .slice(0, 5)
        .map((place) => this.formatPlace(place));

      return places;
    } catch (error) {
      logger.error("Nearby search failed:", error);
      return [];
    }
  }

  formatPlace(place) {
    const location = place.geometry?.location || {};

    return {
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address || place.vicinity,
      lat: location.lat,
      lng: location.lng,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      types: place.types || [],
      open_now: place.opening_hours?.open_now || null,
      price_level: place.price_level,
      maps_url: this.generateMapsUrl(location.lat, location.lng, place.name),
      directions_url: this.generateDirectionsUrl(location.lat, location.lng),
      embed_url: this.generateEmbedUrl(place.place_id),
    };
  }

  formatPlaceDetails(place) {
    const formatted = this.formatPlace(place);

    formatted.phone = place.formatted_phone_number;
    formatted.website = place.website;
    formatted.opening_hours = place.opening_hours?.weekday_text || [];
    formatted.reviews = this.formatReviews(place.reviews || []);
    formatted.photos = this.formatPhotos(place.photos || []);

    return formatted;
  }

  formatReviews(reviews, maxReviews = 3) {
    return reviews.slice(0, maxReviews).map((review) => ({
      author: review.author_name,
      rating: review.rating,
      text: review.text,
      time: review.relative_time_description,
    }));
  }

  formatPhotos(photos, maxPhotos = 3) {
    return photos
      .slice(0, maxPhotos)
      .map((photo) => {
        if (photo.photo_reference) {
          return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.apiKey}`;
        }
        return null;
      })
      .filter((url) => url !== null);
  }

  generateMapsUrl(lat, lng, name) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_name=${encodeURIComponent(name)}`;
  }

  generateDirectionsUrl(lat, lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  generateEmbedUrl(placeId) {
    return `https://www.google.com/maps/embed/v1/place?key=${this.apiKey}&q=place_id:${placeId}`;
  }
}

module.exports = new MapsService();
