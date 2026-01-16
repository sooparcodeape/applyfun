-- ATS Form Field Mappings Cache
-- Stores vision-analyzed field mappings per unique ATS form structure
-- Shared across all users to minimize LLM vision API calls

CREATE TABLE IF NOT EXISTS ats_form_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- ATS identification
  ats_platform VARCHAR(50) NOT NULL, -- 'ashby', 'greenhouse', 'lever', etc.
  company_domain VARCHAR(255), -- Optional: company-specific forms
  form_url_pattern VARCHAR(500) NOT NULL, -- URL pattern to match
  
  -- Form structure fingerprint
  form_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of form HTML structure
  
  -- Vision analysis results
  field_mappings JSON NOT NULL, -- Array of {fieldName, selector, confidence, position}
  screenshot_url VARCHAR(500), -- Reference screenshot used for analysis
  
  -- Metadata
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  usage_count INT DEFAULT 0, -- Track how many times this mapping was used
  success_rate DECIMAL(5,2) DEFAULT 0.00, -- Track effectiveness
  
  -- Indexes for fast lookup
  UNIQUE KEY unique_form (ats_platform, form_hash),
  INDEX idx_platform_domain (ats_platform, company_domain),
  INDEX idx_url_pattern (form_url_pattern(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
