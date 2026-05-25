package pt.ignis.oaz.feature;

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
class FeatureApiTest {

    @LocalServerPort
    private int port;

    @BeforeEach
    void setUp() {
        RestAssured.port = port;
        RestAssured.basePath = "/api/features";
    }

    @Test
    @DisplayName("POST /api/features com polígono - deve criar e calcular área")
    void createPolygonFeature() {
        String body = """
                {
                    "name": "Area ardida teste",
                    "featureType": "area_ardida",
                    "description": "Teste de criação",
                    "geom": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-7.612, 40.321, 1200],
                            [-7.610, 40.323, 1250],
                            [-7.608, 40.322, 1180],
                            [-7.609, 40.320, 1150],
                            [-7.612, 40.321, 1200]
                        ]]
                    }
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(body)
        .when()
                .post()
        .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("name", equalTo("Area ardida teste"))
                .body("featureType", equalTo("area_ardida"))
                .body("area_m2", greaterThan(0f))
                .body("perimeter_m", greaterThan(0f))
                .body("elevation_min_m", equalTo(1150f))
                .body("elevation_max_m", equalTo(1250f));
    }

    @Test
    @DisplayName("POST /api/features com ponto - deve criar sem métricas de área")
    void createPointFeature() {
        String body = """
                {
                    "name": "Ponto de ignição",
                    "featureType": "ponto_interesse",
                    "geom": {
                        "type": "Point",
                        "coordinates": [-7.610, 40.322, 1200]
                    }
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(body)
        .when()
                .post()
        .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("name", equalTo("Ponto de ignição"))
                .body("area_m2", nullValue())
                .body("perimeter_m", nullValue())
                .body("length_m", nullValue())
                .body("elevation_min_m", equalTo(1200f))
                .body("elevation_max_m", equalTo(1200f));
    }

    @Test
    @DisplayName("POST /api/features com linha - deve criar e calcular comprimento")
    void createLineFeature() {
        String body = """
                {
                    "name": "Progressão do fogo",
                    "featureType": "linha_progressao",
                    "geom": {
                        "type": "LineString",
                        "coordinates": [
                            [-7.612, 40.321, 1200],
                            [-7.610, 40.323, 1250],
                            [-7.608, 40.322, 1180]
                        ]
                    }
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(body)
        .when()
                .post()
        .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("length_m", greaterThan(0f))
                .body("area_m2", nullValue());
    }

    @Test
    @DisplayName("POST /api/features sem nome - deve retornar 400")
    void createFeatureWithoutName() {
        String body = """
                {
                    "featureType": "area_ardida",
                    "geom": {
                        "type": "Point",
                        "coordinates": [-7.610, 40.322, 1200]
                    }
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(body)
        .when()
                .post()
        .then()
                .statusCode(400);
    }

    @Test
    @DisplayName("POST /api/features sem geometria - deve retornar 400")
    void createFeatureWithoutGeom() {
        String body = """
                {
                    "name": "Sem geometria",
                    "featureType": "area_ardida"
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(body)
        .when()
                .post()
        .then()
                .statusCode(400);
    }

    @Test
    @DisplayName("GET /api/features - deve listar features criadas")
    void listFeatures() {
        // Criar uma feature primeiro
        String body = """
                {
                    "name": "Feature para listar",
                    "featureType": "teste",
                    "geom": {
                        "type": "Point",
                        "coordinates": [-7.610, 40.322, 100]
                    }
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(body)
        .when()
                .post()
        .then()
                .statusCode(201);

        // Listar
        given()
        .when()
                .get()
        .then()
                .statusCode(200)
                .body("size()", greaterThan(0))
                .body("[0].id", notNullValue())
                .body("[0].name", notNullValue());
    }

    @Test
    @DisplayName("GET /api/features/{id} - deve retornar feature por ID")
    void getFeatureById() {
        // Criar
        String body = """
                {
                    "name": "Feature por ID",
                    "featureType": "teste",
                    "geom": {
                        "type": "Point",
                        "coordinates": [-7.610, 40.322, 500]
                    }
                }
                """;

        String id = given()
                .contentType(ContentType.JSON)
                .body(body)
        .when()
                .post()
        .then()
                .statusCode(201)
                .extract().path("id");

        // Buscar por ID
        given()
        .when()
                .get("/{id}", id)
        .then()
                .statusCode(200)
                .body("id", equalTo(id))
                .body("name", equalTo("Feature por ID"))
                .body("geom.type", equalTo("Point"));
    }

    @Test
    @DisplayName("DELETE /api/features/{id} - deve apagar feature")
    void deleteFeature() {
        // Criar
        String body = """
                {
                    "name": "Feature para apagar",
                    "featureType": "teste",
                    "geom": {
                        "type": "Point",
                        "coordinates": [-7.610, 40.322, 100]
                    }
                }
                """;

        String id = given()
                .contentType(ContentType.JSON)
                .body(body)
        .when()
                .post()
        .then()
                .statusCode(201)
                .extract().path("id");

        // Apagar
        given()
        .when()
                .delete("/{id}", id)
        .then()
                .statusCode(204);

        // Confirmar que não existe
        given()
        .when()
                .get("/{id}", id)
        .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("PUT /api/features/{id} - deve atualizar feature")
    void updateFeature() {
        // Criar
        String createBody = """
                {
                    "name": "Feature original",
                    "featureType": "teste",
                    "description": "Descricao original",
                    "geom": {
                        "type": "Point",
                        "coordinates": [-7.610, 40.322, 100]
                    }
                }
                """;

        String id = given()
                .contentType(ContentType.JSON)
                .body(createBody)
        .when()
                .post()
        .then()
                .statusCode(201)
                .extract().path("id");

        // Atualizar nome, descrição e geometria
        String updateBody = """
                {
                    "name": "Feature atualizada",
                    "featureType": "area_ardida",
                    "description": "Nova descricao",
                    "geom": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-7.612, 40.321, 1200],
                            [-7.610, 40.323, 1250],
                            [-7.608, 40.322, 1180],
                            [-7.609, 40.320, 1150],
                            [-7.612, 40.321, 1200]
                        ]]
                    }
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(updateBody)
        .when()
                .put("/{id}", id)
        .then()
                .statusCode(200)
                .body("id", equalTo(id))
                .body("name", equalTo("Feature atualizada"))
                .body("featureType", equalTo("area_ardida"))
                .body("description", equalTo("Nova descricao"))
                .body("area_m2", greaterThan(0f))
                .body("perimeter_m", greaterThan(0f))
                .body("geom.type", equalTo("Polygon"));
    }

    @Test
    @DisplayName("PUT /api/features/{id} inexistente - deve retornar 404")
    void updateFeatureNotFound() {
        String body = """
                {
                    "name": "Nao existe",
                    "featureType": "teste",
                    "geom": {
                        "type": "Point",
                        "coordinates": [-7.610, 40.322, 100]
                    }
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(body)
        .when()
                .put("/{id}", "00000000-0000-0000-0000-000000000000")
        .then()
                .statusCode(404);
    }

    @Test
    @DisplayName("GET /api/features?bbox= - deve filtrar por bounding box")
    void filterByBbox() {
        // Criar feature dentro da bbox
        String body = """
                {
                    "name": "Dentro da bbox",
                    "featureType": "teste",
                    "geom": {
                        "type": "Point",
                        "coordinates": [-7.610, 40.322, 100]
                    }
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(body)
        .when()
                .post()
        .then()
                .statusCode(201);

        // Buscar com bbox que inclui o ponto
        given()
                .queryParam("bbox", "-8,40,-7,41")
        .when()
                .get()
        .then()
                .statusCode(200)
                .body("size()", greaterThan(0));

        // Buscar com bbox que NÃO inclui o ponto
        given()
                .queryParam("bbox", "10,50,11,51")
        .when()
                .get()
        .then()
                .statusCode(200)
                .body("size()", equalTo(0));
    }
}
