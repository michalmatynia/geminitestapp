// Database query optimization utilities

export type QueryPlan = {
  query: string;
  executionTime: number;
  indexesUsed: string[];
  rowsScanned: number;
  cost: number;
};

export class QueryOptimizer {
  // Optimized product queries with proper index usage
  static getOptimizedQueries(): Record<string, string> {
    return {
      // Use idx_products_sku for SKU lookups
      findBySku: `
        SELECT * FROM products 
        WHERE sku = $1
      `,

      // Use idx_products_price for price filtering
      findByPriceRange: `
        SELECT * FROM products 
        WHERE price BETWEEN $1 AND $2 
        AND stock > 0
        ORDER BY price ASC
      `,

      // Use idx_products_search_vector for full-text search
      searchProducts: `
        SELECT *, ts_rank(search_vector, plainto_tsquery($1)) as rank
        FROM products 
        WHERE search_vector @@ plainto_tsquery($1)
        ORDER BY rank DESC, created_at DESC
        LIMIT $2 OFFSET $3
      `,

      // Use composite index for price + stock filtering
      findInStockByPrice: `
        SELECT * FROM products 
        WHERE price <= $1 AND stock > 0
        ORDER BY price DESC, stock DESC
      `,

      // Use category indexes for category-based queries
      findByCategory: `
        SELECT p.* FROM products p
        JOIN product_category_assignments pca ON p.id = pca.product_id
        WHERE pca.category_id = $1
        ORDER BY p.created_at DESC
      `,

      // Optimized query for product with images
      findWithImages: `
        SELECT 
          p.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', img.id,
                'url', img.storage_path,
                'width', img.width,
                'height', img.height,
                'isPrimary', pi.is_primary
              ) ORDER BY pi.sort_order
            ) FILTER (WHERE img.id IS NOT NULL),
            '[]'
          ) as images
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id
        LEFT JOIN image_files img ON pi.image_file_id = img.id
        WHERE p.id = $1
        GROUP BY p.id
      `,

      // Efficient count query with filters
      countWithFilters: `
        SELECT COUNT(*) FROM products 
        WHERE ($1::text IS NULL OR sku ILIKE $1)
        AND ($2::decimal IS NULL OR price >= $2)
        AND ($3::decimal IS NULL OR price <= $3)
        AND ($4::integer IS NULL OR stock >= $4)
      `,

      // Recent products with limit
      findRecent: `
        SELECT * FROM products 
        ORDER BY created_at DESC 
        LIMIT $1
      `,

      // Supplier products
      findBySupplier: `
        SELECT * FROM products 
        WHERE supplier_name = $1
        ORDER BY created_at DESC
      `
    };
  }

  // Query performance analysis
  static async analyzeQuery(query: string, _params: unknown[] = []): Promise<QueryPlan> {
    // This would integrate with your database client
    // Example with PostgreSQL EXPLAIN ANALYZE
    
    // Placeholder implementation
    return Promise.resolve({
      query,
      executionTime: 0,
      indexesUsed: [],
      rowsScanned: 0,
      cost: 0
    });
  }

  // Index usage recommendations
  static getIndexRecommendations(): Record<string, string> {
    return {
      'slow_sku_lookup': 'CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku)',
      'slow_price_filter': 'CREATE INDEX IF NOT EXISTS idx_products_price ON products(price) WHERE price IS NOT NULL',
      'slow_stock_filter': 'CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock) WHERE stock > 0',
      'slow_search': 'CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING gin(search_vector)',
      'slow_category_lookup': 'CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_category_assignments(category_id)',
      'slow_date_sort': 'CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)',
      'slow_supplier_filter': 'CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_name) WHERE supplier_name IS NOT NULL'
    };
  }

  // Query optimization tips
  static getOptimizationTips(): Record<string, string[]> {
    return {
      'SELECT_queries': [
        'Use specific column names instead of SELECT *',
        'Add WHERE clauses to use indexes',
        'Use LIMIT for pagination',
        'Consider using EXISTS instead of IN for subqueries'
      ],
      'JOIN_queries': [
        'Ensure JOIN conditions use indexed columns',
        'Use INNER JOIN when possible',
        'Consider denormalization for frequently joined data'
      ],
      'WHERE_clauses': [
        'Put most selective conditions first',
        'Use exact matches when possible',
        'Avoid functions in WHERE clauses',
        'Use composite indexes for multiple conditions'
      ],
      'ORDER_BY': [
        'Create indexes that match ORDER BY columns',
        'Combine WHERE and ORDER BY in composite indexes',
        'Consider storing pre-sorted data for common sorts'
      ]
    };
  }
}

// Database connection optimization
export class ConnectionOptimizer {
  static getPoolConfig(): Record<string, string | number> {
    return {
      // Connection pool settings
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
      
      // Performance settings
      statement_timeout: '30s',
      idle_in_transaction_session_timeout: '60s',
      
      // Optimization settings
      shared_preload_libraries: 'pg_stat_statements',
      track_activity_query_size: 2048,
      log_min_duration_statement: 1000 // Log slow queries
    };
  }

  static getPerformanceSettings(): Record<string, string | number | boolean> {
    return {
      // Memory settings
      shared_buffers: '256MB',
      effective_cache_size: '1GB',
      work_mem: '4MB',
      maintenance_work_mem: '64MB',
      
      // Checkpoint settings
      checkpoint_completion_target: 0.9,
      wal_buffers: '16MB',
      
      // Query planner settings
      random_page_cost: 1.1,
      effective_io_concurrency: 200,
      
      // Logging
      log_statement: 'mod',
      log_duration: true,
      log_lock_waits: true
    };
  }
}