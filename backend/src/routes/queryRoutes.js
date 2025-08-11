const express = require("express");
const {
  validateQuery,
  handleValidationErrors,
} = require("../middlewares/queryValidation");
const {
  processQuery,
  getPlaceDetails,
  nearbySearch,
  healthCheck,
} = require("../controllers/queryController");

const router = express.Router();

router.post("/query", validateQuery, handleValidationErrors, processQuery);
router.get("/place/:placeId", getPlaceDetails);
router.post("/nearby", nearbySearch);
router.get("/health", healthCheck);

module.exports = router;
