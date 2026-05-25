package pt.ignis.oaz.category;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pt.ignis.oaz.feature.FeatureRepository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/features/{featureId}/categories")
public class FeatureCategoryController {

    private final FeatureCategoryRepository featureCategoryRepository;
    private final CategoryRepository categoryRepository;
    private final FeatureRepository featureRepository;

    public FeatureCategoryController(
            FeatureCategoryRepository featureCategoryRepository,
            CategoryRepository categoryRepository,
            FeatureRepository featureRepository) {
        this.featureCategoryRepository = featureCategoryRepository;
        this.categoryRepository = categoryRepository;
        this.featureRepository = featureRepository;
    }

    @PostMapping
    public ResponseEntity<?> associate(
            @PathVariable UUID featureId,
            @RequestBody Map<String, String> body) {

        if (!featureRepository.existsById(featureId)) {
            return ResponseEntity.notFound().build();
        }

        UUID categoryId = UUID.fromString(body.get("categoryId"));
        if (!categoryRepository.existsById(categoryId)) {
            return ResponseEntity.notFound().build();
        }

        FeatureCategory fc = new FeatureCategory();
        fc.setFeatureId(featureId);
        fc.setCategoryId(categoryId);
        featureCategoryRepository.save(fc);

        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> list(@PathVariable UUID featureId) {
        if (!featureRepository.existsById(featureId)) {
            return ResponseEntity.notFound().build();
        }

        List<UUID> categoryIds = featureCategoryRepository.findByFeatureId(featureId)
                .stream().map(FeatureCategory::getCategoryId).toList();

        List<CategoryResponse> categories = categoryRepository.findAllById(categoryIds)
                .stream().map(c -> new CategoryResponse(c.getId(), c.getName(), c.getColor(), c.getIcon()))
                .toList();

        return ResponseEntity.ok(categories);
    }
}
