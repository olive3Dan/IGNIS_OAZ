package pt.ignis.oaz.attachment;

import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AttachmentApiTest {

    @LocalServerPort
    private int port;

    private String featureId;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;

        // Criar uma feature para associar attachments
        String body = """
                {
                    "name": "Feature para attachments",
                    "featureType": "teste",
                    "geom": {
                        "type": "Point",
                        "coordinates": [-7.610, 40.322, 100]
                    }
                }
                """;

        featureId = given()
                .contentType(ContentType.JSON)
                .basePath("/api/features")
                .body(body)
        .when()
                .post()
        .then()
                .statusCode(201)
                .extract().path("id");
    }

    @Test
    @DisplayName("POST /api/features/{id}/attachments - upload ficheiro")
    void uploadAttachment() {
        given()
                .basePath("/api/features/" + featureId + "/attachments")
                .multiPart("file", "foto_incendio.jpg", "fake image content".getBytes(), "image/jpeg")
        .when()
                .post()
        .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("fileName", equalTo("foto_incendio.jpg"))
                .body("mimeType", equalTo("image/jpeg"))
                .body("fileSizeBytes", greaterThan(0));
    }

    @Test
    @DisplayName("GET /api/features/{id}/attachments - listar attachments")
    void listAttachments() {
        // Upload primeiro
        given()
                .basePath("/api/features/" + featureId + "/attachments")
                .multiPart("file", "foto1.jpg", "content1".getBytes(), "image/jpeg")
        .when()
                .post()
        .then()
                .statusCode(201);

        given()
                .basePath("/api/features/" + featureId + "/attachments")
                .multiPart("file", "foto2.png", "content2".getBytes(), "image/png")
        .when()
                .post()
        .then()
                .statusCode(201);

        // Listar
        given()
                .basePath("/api/features/" + featureId + "/attachments")
        .when()
                .get()
        .then()
                .statusCode(200)
                .body("size()", equalTo(2));
    }

    @Test
    @DisplayName("DELETE /api/features/{id}/attachments/{attachmentId} - apagar attachment")
    void deleteAttachment() {
        // Upload
        String attachmentId = given()
                .basePath("/api/features/" + featureId + "/attachments")
                .multiPart("file", "para_apagar.jpg", "content".getBytes(), "image/jpeg")
        .when()
                .post()
        .then()
                .statusCode(201)
                .extract().path("id");

        // Apagar
        given()
                .basePath("/api/features/" + featureId + "/attachments")
        .when()
                .delete("/{attachmentId}", attachmentId)
        .then()
                .statusCode(204);

        // Confirmar que não aparece na lista
        given()
                .basePath("/api/features/" + featureId + "/attachments")
        .when()
                .get()
        .then()
                .statusCode(200)
                .body("findAll { it.id == '" + attachmentId + "' }", empty());
    }

    @Test
    @DisplayName("POST /api/features/{id}/attachments - feature inexistente retorna 404")
    void uploadToNonExistentFeature() {
        given()
                .basePath("/api/features/00000000-0000-0000-0000-000000000000/attachments")
                .multiPart("file", "foto.jpg", "content".getBytes(), "image/jpeg")
        .when()
                .post()
        .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("GET /api/attachments/{id}/download - download ficheiro")
    void downloadAttachment() {
        // Upload primeiro
        String attachmentId = given()
                .basePath("/api/features/" + featureId + "/attachments")
                .multiPart("file", "foto_download.jpg", "fake image bytes".getBytes(), "image/jpeg")
        .when()
                .post()
        .then()
                .statusCode(201)
                .extract().path("id");

        // Download
        given()
                .basePath("/api/attachments/" + attachmentId + "/download")
        .when()
                .get()
        .then()
                .statusCode(200)
                .contentType("image/jpeg");
    }

    @Test
    @DisplayName("GET /api/attachments/{id}/download - attachment inexistente retorna 404")
    void downloadNonExistentAttachment() {
        given()
                .basePath("/api/attachments/00000000-0000-0000-0000-000000000000/download")
        .when()
                .get()
        .then()
                .statusCode(404);
    }
}
