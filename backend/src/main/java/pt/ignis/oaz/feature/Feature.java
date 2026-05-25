package pt.ignis.oaz.feature;

import jakarta.persistence.*;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.Point;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "features")
public class Feature {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "feature_type", nullable = false)
    private String featureType;

    private String description;

    @Column(columnDefinition = "jsonb", nullable = false)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    private String properties = "{}";

    @Column(columnDefinition = "geometry(GeometryZ, 4326)", nullable = false)
    private Geometry geom;

    @Column(name = "area_m2")
    private Double areaM2;

    @Column(name = "perimeter_m")
    private Double perimeterM;

    @Column(name = "length_m")
    private Double lengthM;

    @Column(name = "elevation_min_m")
    private Double elevationMinM;

    @Column(name = "elevation_max_m")
    private Double elevationMaxM;

    @Column(name = "elevation_avg_m")
    private Double elevationAvgM;

    @Column(columnDefinition = "geometry(PointZ, 4326)")
    private Point centroid;

    @Column(columnDefinition = "geometry(GeometryZ, 4326)")
    private Geometry bbox;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    // Getters and setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getFeatureType() { return featureType; }
    public void setFeatureType(String featureType) { this.featureType = featureType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getProperties() { return properties; }
    public void setProperties(String properties) { this.properties = properties; }

    public Geometry getGeom() { return geom; }
    public void setGeom(Geometry geom) { this.geom = geom; }

    public Double getAreaM2() { return areaM2; }
    public void setAreaM2(Double areaM2) { this.areaM2 = areaM2; }

    public Double getPerimeterM() { return perimeterM; }
    public void setPerimeterM(Double perimeterM) { this.perimeterM = perimeterM; }

    public Double getLengthM() { return lengthM; }
    public void setLengthM(Double lengthM) { this.lengthM = lengthM; }

    public Double getElevationMinM() { return elevationMinM; }
    public void setElevationMinM(Double elevationMinM) { this.elevationMinM = elevationMinM; }

    public Double getElevationMaxM() { return elevationMaxM; }
    public void setElevationMaxM(Double elevationMaxM) { this.elevationMaxM = elevationMaxM; }

    public Double getElevationAvgM() { return elevationAvgM; }
    public void setElevationAvgM(Double elevationAvgM) { this.elevationAvgM = elevationAvgM; }

    public Point getCentroid() { return centroid; }
    public void setCentroid(Point centroid) { this.centroid = centroid; }

    public Geometry getBbox() { return bbox; }
    public void setBbox(Geometry bbox) { this.bbox = bbox; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
