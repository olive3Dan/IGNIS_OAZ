package pt.ignis.oaz.category;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class FeatureCategoryId implements Serializable {

    private UUID featureId;
    private UUID categoryId;

    public FeatureCategoryId() {}

    public FeatureCategoryId(UUID featureId, UUID categoryId) {
        this.featureId = featureId;
        this.categoryId = categoryId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FeatureCategoryId that)) return false;
        return Objects.equals(featureId, that.featureId) && Objects.equals(categoryId, that.categoryId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(featureId, categoryId);
    }
}
