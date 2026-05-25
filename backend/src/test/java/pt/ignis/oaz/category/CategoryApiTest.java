package pt.ignis.oaz.category;

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
class CategoryApiTest {

    @LocalServerPort
    private int port;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/categories";
    }

    @Test
    @DisplayName("POST /api/categories - criar categoria")
    void createCategory() {
        String body = """
                {
                    "name": "Incendio Florestal %s",
                    "color": "#FF4500",
                    "icon": "fire"
                }
                """.formatted(System.nanoTime());

        given()
                .contentType(ContentType.JSON)
                .body(body)
        .when()
                .post()
        .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("color", equalTo("#FF4500"))
                .body("icon", equalTo("fire"));
    }

    @Test
    @DisplayName("GET /api/categories - listar categorias")
    void listCategories() {
        // Criar
        given()
                .contentType(ContentType.JSON)
                .body("""
                    {"name": "Cat lista %s", "color": "#000"}
                """.formatted(System.nanoTime()))
        .when().post().then().statusCode(201);

        given()
        .when()
                .get()
        .then()
                .statusCode(200)
                .body("size()", greaterThan(0));
    }

    @Test
    @DisplayName("DELETE /api/categories/{id} - apagar categoria (cascade só na associação)")
    void deleteCategory() {
        // Criar categoria
        String catId = given()
                .contentType(ContentType.JSON)
                .body("""
                    {"name": "Para apagar %s", "color": "#FFF"}
                """.formatted(System.nanoTime()))
        .when()
                .post()
        .then()
                .statusCode(201)
                .extract().path("id");

        // Criar feature e associar
        String featureId = given()
                .basePath("/api/features")
                .contentType(ContentType.JSON)
                .body("""
                    {
                        "name": "Feature com categoria",
                        "featureType": "teste",
                        "geom": {"type": "Point", "coordinates": [-7.6, 40.3, 100]}
                    }
                """)
        .when()
                .post()
        .then()
                .statusCode(201)
                .extract().path("id");

        // Associar feature à categoria
        given()
                .basePath("/api/features/" + featureId + "/categories")
                .contentType(ContentType.JSON)
                .body("{\"categoryId\": \"" + catId + "\"}")
        .when()
                .post()
        .then()
                .statusCode(200);

        // Apagar categoria
        given()
        .when()
                .delete("/{id}", catId)
        .then()
                .statusCode(204);

        // Feature ainda existe
        given()
                .basePath("/api/features")
        .when()
                .get("/{id}", featureId)
        .then()
                .statusCode(200)
                .body("name", equalTo("Feature com categoria"));
    }

    @Test
    @DisplayName("POST /api/features/{id}/categories - associar categoria a feature")
    void associateCategoryToFeature() {
        // Criar categoria
        String catId = given()
                .contentType(ContentType.JSON)
                .body("""
                    {"name": "Associar teste %s", "color": "#0F0"}
                """.formatted(System.nanoTime()))
        .when()
                .post()
        .then()
                .statusCode(201)
                .extract().path("id");

        // Criar feature
        String featureId = given()
                .basePath("/api/features")
                .contentType(ContentType.JSON)
                .body("""
                    {
                        "name": "Feature para associar",
                        "featureType": "teste",
                        "geom": {"type": "Point", "coordinates": [-7.6, 40.3, 100]}
                    }
                """)
        .when()
                .post()
        .then()
                .statusCode(201)
                .extract().path("id");

        // Associar
        given()
                .basePath("/api/features/" + featureId + "/categories")
                .contentType(ContentType.JSON)
                .body("{\"categoryId\": \"" + catId + "\"}")
        .when()
                .post()
        .then()
                .statusCode(200);

        // Listar categorias da feature
        given()
                .basePath("/api/features/" + featureId + "/categories")
        .when()
                .get()
        .then()
                .statusCode(200)
                .body("size()", equalTo(1))
                .body("[0].name", containsString("Associar teste"));
    }
}
