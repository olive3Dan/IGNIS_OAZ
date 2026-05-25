package pt.ignis.oaz.attachment;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AttachmentResponse(
        UUID id,
        String fileName,
        String mimeType,
        Long fileSizeBytes,
        String createdAt
) {}
