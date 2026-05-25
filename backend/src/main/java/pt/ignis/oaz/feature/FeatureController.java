package pt.ignis.oaz.feature;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/features")
public class FeatureController {

    private final FeatureService service;

    public FeatureController(FeatureService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<FeatureResponse> create(@Valid @RequestBody FeatureRequest request) {
        Feature feature = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.toResponse(feature));
    }

    @GetMapping
    public ResponseEntity<List<FeatureResponse>> list(
            @RequestParam(required = false) String bbox) {

        List<Feature> features;
        if (bbox != null && !bbox.isBlank()) {
            String[] parts = bbox.split(",");
            if (parts.length != 4) {
                return ResponseEntity.badRequest().build();
            }
            double minX = Double.parseDouble(parts[0]);
            double minY = Double.parseDouble(parts[1]);
            double maxX = Double.parseDouble(parts[2]);
            double maxY = Double.parseDouble(parts[3]);
            features = service.findWithinBbox(minX, minY, maxX, maxY);
        } else {
            features = service.findAll();
        }

        List<FeatureResponse> response = features.stream()
                .map(service::toResponse)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FeatureResponse> getById(@PathVariable UUID id) {
        Feature feature = service.findById(id);
        if (feature == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(service.toResponse(feature));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FeatureResponse> update(@PathVariable UUID id, @Valid @RequestBody FeatureRequest request) {
        Feature feature = service.update(id, request);
        if (feature == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(service.toResponse(feature));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Feature feature = service.findById(id);
        if (feature == null) {
            return ResponseEntity.notFound().build();
        }
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
