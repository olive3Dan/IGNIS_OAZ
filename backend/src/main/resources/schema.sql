-- =========================================================
-- EXTENSIONS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(254) NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_user_email CHECK (char_length(trim(email)) > 0),
    CONSTRAINT chk_user_name CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 100),
    CONSTRAINT chk_user_role CHECK (role IN ('USER', 'ADMIN'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));

-- =========================================================
-- REFRESH TOKENS
-- =========================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Updated_at trigger for users
CREATE OR REPLACE FUNCTION set_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
        CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_users_updated_at();
    END IF;
END;
$$;

-- =========================================================
-- DEFAULT ADMIN USER
-- =========================================================

INSERT INTO users (email, name, password_hash, role)
VALUES ('daniedu18@gmail.com', 'Daniel', '$2b$10$2AKHymgjyDOYUlY6FyF5fO2mQ5FT/DtWhXyL.a6cU0M0.aIWeRSDG', 'ADMIN')
ON CONFLICT (lower(email)) DO NOTHING;

-- =========================================================
-- FEATURES
-- =========================================================

CREATE TABLE IF NOT EXISTS features (

    -- -----------------------------------------------------
    -- PRIMARY KEY
    -- -----------------------------------------------------

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- -----------------------------------------------------
    -- CORE DATA
    -- -----------------------------------------------------

    name TEXT NOT NULL,

    feature_type TEXT NOT NULL,

    description TEXT,

    -- -----------------------------------------------------
    -- DYNAMIC ATTRIBUTES
    -- -----------------------------------------------------

    properties JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- -----------------------------------------------------
    -- SPATIAL DATA
    -- -----------------------------------------------------

    -- Generic 3D geometry
    -- Supports:
    -- POINTZ
    -- LINESTRINGZ
    -- POLYGONZ
    -- MULTIPOLYGONZ
    -- etc

    geom geometry(GEOMETRYZ, 4326) NOT NULL,

    -- -----------------------------------------------------
    -- PRECOMPUTED SPATIAL METRICS
    -- -----------------------------------------------------

    area_m2 DOUBLE PRECISION,

    perimeter_m DOUBLE PRECISION,

    length_m DOUBLE PRECISION,

    elevation_min_m DOUBLE PRECISION,

    elevation_max_m DOUBLE PRECISION,

    elevation_avg_m DOUBLE PRECISION,

    -- -----------------------------------------------------
    -- PRECOMPUTED GEOMETRIES
    -- -----------------------------------------------------

    centroid geometry(POINTZ, 4326),

    bbox geometry(GEOMETRYZ, 4326),

    -- -----------------------------------------------------
    -- METADATA
    -- -----------------------------------------------------

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- -----------------------------------------------------
    -- CONSTRAINTS
    -- -----------------------------------------------------

    CONSTRAINT chk_feature_name
    CHECK (char_length(trim(name)) > 0),

    CONSTRAINT chk_feature_type
    CHECK (char_length(trim(feature_type)) > 0),

    CONSTRAINT chk_geom_valid
    CHECK (ST_IsValid(geom)),

    CONSTRAINT chk_geom_not_empty
    CHECK (NOT ST_IsEmpty(geom))

);

-- =========================================================
-- INDEXES
-- =========================================================

-- Spatial index
CREATE INDEX idx_features_geom
ON features
USING GIST (geom);

-- Centroid spatial index
CREATE INDEX idx_features_centroid
ON features
USING GIST (centroid);

-- JSONB index
CREATE INDEX idx_features_properties
ON features
USING GIN (properties);

-- Feature type filtering
CREATE INDEX idx_features_feature_type
ON features(feature_type);

-- Area filtering
CREATE INDEX idx_features_area
ON features(area_m2);

-- Length filtering
CREATE INDEX idx_features_length
ON features(length_m);

-- Created at
CREATE INDEX idx_features_created_at
ON features(created_at DESC);

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS
$$
BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE
ON features
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- SPATIAL METRICS TRIGGER
-- =========================================================

CREATE OR REPLACE FUNCTION update_spatial_metrics()
RETURNS TRIGGER AS
$$
DECLARE
    geom_type TEXT;
BEGIN

    geom_type := GeometryType(NEW.geom);

    -- -----------------------------------------------------
    -- CENTROID
    -- -----------------------------------------------------

    NEW.centroid :=
        ST_Force3D(
            ST_Centroid(NEW.geom)
        );

    -- -----------------------------------------------------
    -- BBOX
    -- -----------------------------------------------------

    NEW.bbox :=
        ST_Force3DZ(
            ST_Envelope(NEW.geom)
        );

    -- -----------------------------------------------------
    -- RESET VALUES
    -- -----------------------------------------------------

    NEW.area_m2 = NULL;
    NEW.perimeter_m = NULL;
    NEW.length_m = NULL;

    -- -----------------------------------------------------
    -- POLYGONS
    -- -----------------------------------------------------

    IF geom_type IN ('POLYGON', 'MULTIPOLYGON') THEN

        NEW.area_m2 :=
            ST_Area(
                NEW.geom::geography
            );

        NEW.perimeter_m :=
            ST_Perimeter(
                NEW.geom::geography
            );

    END IF;

    -- -----------------------------------------------------
    -- LINES
    -- -----------------------------------------------------

    IF geom_type IN ('LINESTRING', 'MULTILINESTRING') THEN

        NEW.length_m :=
            ST_Length(
                NEW.geom::geography
            );

    END IF;

    -- -----------------------------------------------------
    -- Z METRICS
    -- -----------------------------------------------------

    IF ST_HasZ(NEW.geom) THEN

        SELECT
            MIN(ST_Z((dp).geom)),
            MAX(ST_Z((dp).geom)),
            AVG(ST_Z((dp).geom))
        INTO
            NEW.elevation_min_m,
            NEW.elevation_max_m,
            NEW.elevation_avg_m
        FROM
            ST_DumpPoints(NEW.geom) dp;

    ELSE

        NEW.elevation_min_m = NULL;
        NEW.elevation_max_m = NULL;
        NEW.elevation_avg_m = NULL;

    END IF;

    RETURN NEW;

END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_spatial_metrics
BEFORE INSERT OR UPDATE OF geom
ON features
FOR EACH ROW
EXECUTE FUNCTION update_spatial_metrics();

-- =========================================================
-- CATEGORIES
-- =========================================================

CREATE TABLE categories (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL UNIQUE,

    color TEXT,

    icon TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_category_name
    CHECK (char_length(trim(name)) > 0)

);

CREATE INDEX idx_categories_name
ON categories(name);

-- =========================================================
-- FEATURE <-> CATEGORY
-- MANY TO MANY
-- =========================================================

CREATE TABLE feature_categories (

    feature_id UUID NOT NULL
        REFERENCES features(id)
        ON DELETE CASCADE,

    category_id UUID NOT NULL
        REFERENCES categories(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY(feature_id, category_id)

);

CREATE INDEX idx_feature_categories_feature
ON feature_categories(feature_id);

CREATE INDEX idx_feature_categories_category
ON feature_categories(category_id);

-- =========================================================
-- ATTACHMENTS
-- =========================================================

CREATE TABLE attachments (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    feature_id UUID NOT NULL
        REFERENCES features(id)
        ON DELETE CASCADE,

    file_name TEXT NOT NULL,

    mime_type TEXT NOT NULL,

    file_size_bytes BIGINT NOT NULL,

    storage_path TEXT NOT NULL,

    checksum_sha256 TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_file_size
    CHECK (file_size_bytes >= 0)

);

CREATE INDEX idx_attachments_feature
ON attachments(feature_id);

CREATE INDEX idx_attachments_metadata
ON attachments
USING GIN(metadata);

-- =========================================================
-- VIEW
-- API READY GEOJSON
-- =========================================================

CREATE OR REPLACE VIEW v_features_geojson AS
SELECT

    id,

    jsonb_build_object(

        'type', 'Feature',

        'geometry',
        ST_AsGeoJSON(geom)::jsonb,

        'properties',
        jsonb_build_object(

            'id', id,

            'name', name,

            'feature_type', feature_type,

            'description', description,

            'area_m2', area_m2,

            'perimeter_m', perimeter_m,

            'length_m', length_m,

            'elevation_min_m', elevation_min_m,

            'elevation_max_m', elevation_max_m,

            'elevation_avg_m', elevation_avg_m,

            'created_at', created_at,

            'updated_at', updated_at

        ) || properties

    ) AS geojson

FROM features;

