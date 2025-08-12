const { Client } = require("@googlemaps/google-maps-services-js");
const config = require("../config/config");
const logger = require("../utils/logger");

class MapsService {
  constructor() {
    this.client = new Client({});
    this.apiKey = config.googleMaps.apiKey;
  }

  /**
   * Searches for places based on a text query.
   * @param {string} query The text string on which to search.
   * @param {string | null} location The latitude/longitude around which to retrieve place information. Defaults to config.
   * @param {number | null} radius The radius in meters to search in. Defaults to config.
   * @param {string | null} placeType Restricts the results to places of the specified type.
   * @returns {Promise<Array<object>>} A promise that resolves to an array of formatted place objects.
   */
  async searchPlaces(query, location = null, radius = null, placeType = null) {
    try {
      const params = {
        key: this.apiKey,
        query,
        language: config.googleMaps.defaultLanguage,
        region: config.googleMaps.defaultRegion,
        location: location || config.googleMaps.defaultLocation,
        radius: radius || config.googleMaps.searchRadius,
      };

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

  /**
   * Retrieves detailed information about a specific place.
   * @param {string} placeId The unique identifier of the place.
   * @returns {Promise<object | null>} A promise that resolves to a formatted place details object or null if not found.
   */
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

  /**
   * Performs a nearby search for places of a certain type or keyword.
   * @param {string} location The latitude/longitude around which to search.
   * @param {string} placeType Restricts the results to places of the specified type.
   * @param {number} [radius=1000] The radius in meters to search in.
   * @param {string | null} keyword A keyword to match against place names, types, and addresses.
   * @returns {Promise<Array<object>>} A promise that resolves to an array of formatted place objects.
   */
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

  /**
   * Formats a raw place object from the API response into a cleaner format.
   * @param {object} place The raw place object.
   * @returns {object} The formatted place object.
   */
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

  /**
   * Formats a raw place details object from the API response.
   * @param {object} place The raw place details object.
   * @returns {object} The formatted place details object.
   */
  formatPlaceDetails(place) {
    const formatted = this.formatPlace(place);

    formatted.phone = place.formatted_phone_number;
    formatted.website = place.website;
    formatted.opening_hours = place.opening_hours?.weekday_text || [];
    formatted.reviews = this.formatReviews(place.reviews || []);
    formatted.photos = this.formatPhotos(place.photos || []);

    return formatted;
  }

  /**
   * Formats and limits the number of reviews.
   * @param {Array<object>} reviews An array of raw review objects.
   * @param {number} [maxReviews=3] The maximum number of reviews to return.
   * @returns {Array<object>} An array of formatted review objects.
   */
  formatReviews(reviews, maxReviews = 3) {
    return reviews.slice(0, maxReviews).map((review) => ({
      author: review.author_name,
      rating: review.rating,
      text: review.text,
      time: review.relative_time_description,
    }));
  }

  /**
   * Formats and limits the number of photos, generating API URLs.
   * @param {Array<object>} photos An array of raw photo objects.
   * @param {number} [maxPhotos=3] The maximum number of photos to return.
   * @returns {Array<string>} An array of photo URLs.
   */
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

  /**
   * Generates a Google Maps URL for a specific location and name.
   * @param {number} lat The latitude of the place.
   * @param {number} lng The longitude of the place.
   * @param {string} name The name of the place.
   * @returns {string} The formatted Google Maps URL.
   */
  generateMapsUrl(lat, lng, name) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_name=${encodeURIComponent(name)}`;
  }

  /**
   * Generates a Google Maps directions URL.
   * @param {number} lat The latitude of the destination.
   * @param {number} lng The longitude of the destination.
   * @returns {string} The formatted Google Maps directions URL.
   */
  generateDirectionsUrl(lat, lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  /**
   * Generates an embeddable Google Maps URL for an iframe.
   * @param {string} placeId The unique identifier of the place.
   * @returns {string} The formatted embed URL.
   */
  generateEmbedUrl(placeId) {
    return `https://www.google.com/maps/embed/v1/place?key=${this.apiKey}&q=place_id:${placeId}`;
  }
}

module.exports = new MapsService();
