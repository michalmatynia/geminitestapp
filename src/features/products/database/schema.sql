-- Optimized Product Database Schema with Indexing

-- Products table with optimized structure
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    base_product_id UUID REFERENCES products(id),
    default_price_group_id UUID,
    
    -- Product identifiers (indexed for lookups)
    ean VARCHAR(13),
    gtin VARCHAR(14),
    asin VARCHAR(10),
    
    -- Multilingual names (indexed for search)
    name_en VARCHAR(200),
    name_pl VARCHAR(200),
    name_de VARCHAR(200),
    
    -- Multilingual descriptions (full-text search)
    description_en TEXT,
    description_pl TEXT,
    description_de TEXT,
    
    -- Supplier information
    supplier_name VARCHAR(100),
    supplier_link VARCHAR(500),
    price_comment VARCHAR(500),
    
    -- Numeric fields (indexed for filtering)
    price DECIMAL(10,2) CHECK (price >= 0),
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    size_length DECIMAL(8,2) CHECK (size_length >= 0),
    size_width DECIMAL(8,2) CHECK (size_width >= 0),
    weight DECIMAL(8,2) CHECK (weight >= 0),
    length DECIMAL(8,2) CHECK (length >= 0),
    
    -- Media arrays
    image_links TEXT[] DEFAULT '{}',
    image_base64s TEXT[] DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Search vector for full-text search
    search_vector tsvector
);

-- Performance-critical indexes
CREATE UNIQUE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_price ON products(price) WHERE price IS NOT NULL;
CREATE INDEX idx_products_stock ON products(stock) WHERE stock > 0;
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_updated_at ON products(updated_at);

-- Search indexes
CREATE INDEX idx_products_name_en ON products USING gin(to_tsvector('english', name_en)) WHERE name_en IS NOT NULL;
CREATE INDEX idx_products_search_vector ON products USING gin(search_vector);

-- Composite indexes for common queries
CREATE INDEX idx_products_price_stock ON products(price, stock) WHERE price IS NOT NULL AND stock > 0;
CREATE INDEX idx_products_supplier ON products(supplier_name) WHERE supplier_name IS NOT NULL;

-- Product identifiers index (for external system lookups)
CREATE INDEX idx_products_identifiers ON products(ean, gtin, asin) WHERE ean IS NOT NULL OR gtin IS NOT NULL OR asin IS NOT NULL;

-- Categories table with hierarchy support
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES product_categories(id),
    level INTEGER DEFAULT 0,
    path TEXT, -- Materialized path for hierarchy queries
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Category indexes
CREATE INDEX idx_categories_parent_id ON product_categories(parent_id);
CREATE INDEX idx_categories_path ON product_categories USING gin(string_to_array(path, '.'));
CREATE INDEX idx_categories_level ON product_categories(level);
CREATE UNIQUE INDEX idx_categories_slug ON product_categories(slug);

-- Product-Category junction table
CREATE TABLE product_category_assignments (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (product_id, category_id)
);

-- Junction table indexes
CREATE INDEX idx_product_categories_product ON product_category_assignments(product_id);
CREATE INDEX idx_product_categories_category ON product_category_assignments(category_id);

-- Product parameters for flexible attributes
CREATE TABLE product_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_pl VARCHAR(100),
    name_de VARCHAR(100),
    parameter_type VARCHAR(20) DEFAULT 'text', -- text, number, boolean, select
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_parameters_catalog ON product_parameters(catalog_id);
CREATE INDEX idx_parameters_name_en ON product_parameters(name_en);

-- Product parameter values
CREATE TABLE product_parameter_values (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    parameter_id UUID REFERENCES product_parameters(id) ON DELETE CASCADE,
    value TEXT,
    numeric_value DECIMAL(15,4), -- For numeric parameters
    boolean_value BOOLEAN, -- For boolean parameters
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (product_id, parameter_id)
);

-- Parameter values indexes
CREATE INDEX idx_parameter_values_product ON product_parameter_values(product_id);
CREATE INDEX idx_parameter_values_parameter ON product_parameter_values(parameter_id);
CREATE INDEX idx_parameter_values_numeric ON product_parameter_values(numeric_value) WHERE numeric_value IS NOT NULL;

-- Image files table
CREATE TABLE image_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR(255) NOT NULL,
    sanitized_name VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) UNIQUE NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    storage_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Image indexes
CREATE UNIQUE INDEX idx_images_hash ON image_files(file_hash);
CREATE INDEX idx_images_mime_type ON image_files(mime_type);
CREATE INDEX idx_images_dimensions ON image_files(width, height) WHERE width IS NOT NULL AND height IS NOT NULL;

-- Product-Image junction
CREATE TABLE product_images (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_file_id UUID REFERENCES image_files(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (product_id, image_file_id)
);

-- Product images indexes
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_primary ON product_images(product_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_product_images_sort ON product_images(product_id, sort_order);

-- Triggers for maintaining search vectors and updated_at
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.name_en, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name_pl, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.name_de, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description_en, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.sku, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.supplier_name, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_search_vector
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance monitoring views
CREATE VIEW product_performance_stats AS
SELECT 
    COUNT(*) as total_products,
    COUNT(*) FILTER (WHERE stock > 0) as in_stock_products,
    AVG(price) as avg_price,
    COUNT(DISTINCT supplier_name) as unique_suppliers,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as products_last_30_days
FROM products;

-- Query optimization hints
-- Use these indexes for common query patterns:
-- 1. Product lookup by SKU: idx_products_sku
-- 2. Price range filtering: idx_products_price
-- 3. In-stock products: idx_products_stock
-- 4. Search by name: idx_products_name_en or idx_products_search_vector
-- 5. Recent products: idx_products_created_at
-- 6. Category products: idx_product_categories_category + idx_product_categories_product