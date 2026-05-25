package pt.ignis.oaz.feature;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.geojson.GeoJsonReader;
import org.locationtech.jts.io.geojson.GeoJsonWriter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class FeatureService {

    private final FeatureRepository repository;
    private final ObjectMapper objectMapper;
    private final EntityManager entityManager;

    public FeatureService(FeatureRepository repository, ObjectMapper objectMapper, EntityManager entityManager) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.entityManager = entityManager;
    }

    @Transactional
    public Feature create(FeatureRequest request) {
        Feature feature = new Feature();
        feature.setName(request.name());
        feature.setFeatureType(request.featureType());
        feature.setDescription(request.description());
        feature.setGeom(parseGeometry(request.geom()));

        if (request.properties() != null) {
            try {
                feature.setProperties(objectMapper.writeValueAsString(request.properties()));
            } catch (Exception e) {
                feature.setProperties("{}");
            }
        }

        feature = repository.saveAndFlush(feature);
        entityManager.refresh(feature);
        return feature;
    }

    @Transactional
    public Feature update(UUID id, FeatureRequest request) {
        Feature feature = repository.findById(id).orElse(null);
        if (feature == null) return null;

        feature.setName(request.name());
        feature.setFeatureType(request.featureType());
        feature.setDescription(request.description());
        feature.setGeom(parseGeometry(request.geom()));

        if (request.properties() != null) {
            try {
                feature.setProperties(objectMapper.writeValueAsString(request.properties()));
            } catch (Exception e) {
                feature.setProperties("{}");
            }
        }

        feature = repository.saveAndFlush(feature);
        entityManager.refresh(feature);
        return feature;
    }

    @Transactional(readOnly = true)
    public List<Feature> findAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public Feature findById(UUID id) {
        return repository.findById(id).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Feature> findWithinBbox(double minX, double minY, double maxX, double maxY) {
        return repository.findWithinBbox(minX, minY, maxX, maxY);
    }

    @Transactional
    public void delete(UUID id) {
        repository.deleteById(id);
    }

    public FeatureResponse toResponse(Feature feature) {
        return new FeatureResponse(
                feature.getId(),
                feature.getName(),
                feature.getFeatureType(),
                feature.getDescription(),
                geometryToMap(feature.getGeom()),
                feature.getAreaM2(),
                feature.getPerimeterM(),
                feature.getLengthM(),
                feature.getElevationMinM(),
                feature.getElevationMaxM(),
                feature.getElevationAvgM(),
                parseProperties(feature.getProperties())
        );
    }

    private Geometry parseGeometry(Map<String, Object> geomMap) {
        try {
            String geojson = objectMapper.writeValueAsString(geomMap);
            GeoJsonReader reader = new GeoJsonReader();
            Geometry geom = reader.read(geojson);
            geom.setSRID(4326);
            return geom;
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid GeoJSON geometry: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> geometryToMap(Geometry geom) {
        if (geom == null) return null;
        try {
            GeoJsonWriter writer = new GeoJsonWriter();
            writer.setEncodeCRS(false);
            String geojson = writer.write(geom);
            return objectMapper.readValue(geojson, new TypeReference<>() {});
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> parseProperties(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }
}
