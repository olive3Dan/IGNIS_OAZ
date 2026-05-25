package pt.ignis.oaz.category;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface FeatureCategoryRepository extends JpaRepository<FeatureCategory, FeatureCategoryId> {

    List<FeatureCategory> findByFeatureId(UUID featureId);
}
