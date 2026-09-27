const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const openapiPath = path.join(__dirname, '../openapi.yaml');

console.log('--- Starting OpenAPI Validation ---');

try {
    // Check if file exists
    if (!fs.existsSync(openapiPath)) {
        console.error('❌ Error: openapi.yaml not found at ' + openapiPath);
        process.exit(1);
    }

    // Read file
    const fileContents = fs.readFileSync(openapiPath, 'utf8');
    
    // Parse YAML
    const spec = yaml.load(fileContents);

    // Validate basic OpenAPI 3.0 structure
    if (!spec.openapi || !spec.openapi.startsWith('3.')) {
        console.error('❌ Error: Specification must be OpenAPI 3.x');
        process.exit(1);
    }

    if (!spec.info || !spec.info.title || !spec.info.version) {
        console.error('❌ Error: Specification is missing required "info.title" or "info.version"');
        process.exit(1);
    }

    if (!spec.paths || Object.keys(spec.paths).length === 0) {
        console.error('❌ Error: Specification must define at least one path in "paths"');
        process.exit(1);
    }

    console.log('✅ OpenAPI Specification is valid:');
    console.log(`   Title: ${spec.info.title}`);
    console.log(`   Version: ${spec.info.version}`);
    console.log(`   Total Paths: ${Object.keys(spec.paths).length}`);
    
    console.log('--- Validation Completed Successfully ---');
    process.exit(0);
} catch (e) {
    console.error('❌ Error parsing OpenAPI YAML:', e.message);
    process.exit(1);
}
