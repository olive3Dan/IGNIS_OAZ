package pt.ignis.oaz.feature;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface FeatureRepository extends JpaRepository<Feature, UUID> {

    List<Feature> findByFeatureType(String featureType);

    @Query(value = """
            SELECT * FROM features
            WHERE ST_Intersects(geom, ST_MakeEnvelope(:minX, :minY, :maxX, :maxY, 4326))
            """, nativeQuery = true)
    List<Feature> findWithinBbox(
            @Param("minX") double minX,
            @Param("minY") double minY,
            @Param("maxX") double maxX,
            @Param("maxY") double maxY
    );
}
