package pt.ignis.oaz.feature;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FeatureResponse(
        UUID id,
        String name,
        @JsonProperty("featureType") String featureType,
        String description,
        Map<String, Object> geom,
        @JsonProperty("area_m2") Double areaM2,
        @JsonProperty("perimeter_m") Double perimeterM,
        @JsonProperty("length_m") Double lengthM,
        @JsonProperty("elevation_min_m") Double elevationMinM,
        @JsonProperty("elevation_max_m") Double elevationMaxM,
        @JsonProperty("elevation_avg_m") Double elevationAvgM,
        Map<String, Object> properties
) {}
