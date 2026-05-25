package pt.ignis.oaz.attachment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pt.ignis.oaz.feature.FeatureRepository;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@RestController
public class AttachmentController {

    private final AttachmentRepository attachmentRepository;
    private final FeatureRepository featureRepository;
    private final Path uploadDir;

    public AttachmentController(
            AttachmentRepository attachmentRepository,
            FeatureRepository featureRepository,
            @Value("${ignis.upload.dir:./uploads}") String uploadDir) {
        this.attachmentRepository = attachmentRepository;
        this.featureRepository = featureRepository;
        this.uploadDir = Path.of(uploadDir).toAbsolutePath();
    }

    @PostMapping("/api/features/{featureId}/attachments")
    public ResponseEntity<AttachmentResponse> upload(
            @PathVariable UUID featureId,
            @RequestParam("file") MultipartFile file) throws IOException {

        if (!featureRepository.existsById(featureId)) {
            return ResponseEntity.notFound().build();
        }

        // Guardar ficheiro no filesystem
        Files.createDirectories(uploadDir);
        String storedName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = uploadDir.resolve(storedName);
        Files.copy(file.getInputStream(), filePath);

        // Guardar metadata na BD
        Attachment attachment = new Attachment();
        attachment.setFeatureId(featureId);
        attachment.setFileName(file.getOriginalFilename());
        attachment.setMimeType(file.getContentType());
        attachment.setFileSizeBytes(file.getSize());
        attachment.setStoragePath(filePath.toString());

        attachment = attachmentRepository.save(attachment);

        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(attachment));
    }

    @GetMapping("/api/features/{featureId}/attachments")
    public ResponseEntity<List<AttachmentResponse>> list(@PathVariable UUID featureId) {
        if (!featureRepository.existsById(featureId)) {
            return ResponseEntity.notFound().build();
        }

        List<AttachmentResponse> responses = attachmentRepository.findByFeatureId(featureId)
                .stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/api/features/{featureId}/attachments/{attachmentId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID featureId,
            @PathVariable UUID attachmentId) {

        Attachment attachment = attachmentRepository.findById(attachmentId).orElse(null);
        if (attachment == null || !attachment.getFeatureId().equals(featureId)) {
            return ResponseEntity.notFound().build();
        }

        // Apagar ficheiro do filesystem
        try {
            Files.deleteIfExists(Path.of(attachment.getStoragePath()));
        } catch (IOException ignored) {}

        attachmentRepository.delete(attachment);
        return ResponseEntity.noContent().build();
    }

    /**
     * Download endpoint — serves the file content for viewing/downloading.
     * Used by the frontend for image previews and file downloads.
     */
    @GetMapping("/api/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId).orElse(null);
        if (attachment == null) {
            return ResponseEntity.notFound().build();
        }

        Path filePath = Path.of(attachment.getStoragePath());
        // If stored path is relative, resolve against uploadDir
        if (!filePath.isAbsolute()) {
            filePath = uploadDir.resolve(filePath.getFileName());
        }
        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }

        try {
            Resource resource = new UrlResource(filePath.toUri());
            MediaType mediaType = MediaType.parseMediaType(
                    attachment.getMimeType() != null ? attachment.getMimeType() : "application/octet-stream");

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + attachment.getFileName() + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private AttachmentResponse toResponse(Attachment a) {
        return new AttachmentResponse(
                a.getId(),
                a.getFileName(),
                a.getMimeType(),
                a.getFileSizeBytes(),
                a.getCreatedAt() != null ? a.getCreatedAt().toString() : null
        );
    }
}
