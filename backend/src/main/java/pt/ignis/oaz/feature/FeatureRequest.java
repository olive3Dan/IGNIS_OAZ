package pt.ignis.oaz.feature;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

public record FeatureRequest(
        @NotBlank String name,
        @NotBlank @JsonProperty("featureType") String featureType,
        String description,
        @NotNull Map<String, Object> geom,
        Map<String, Object> properties
) {}
