/*
 * Core Application Logic
 * Fetches and parses OpenAPI spec, renders UI dynamically
 */

// Expose global state for search
window.apiSpec = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Load OpenAPI Spec
    try {
        const response = await fetch('openapi.yaml');
        if (!response.ok) throw new Error('Failed to load openapi.yaml');
        
        const yamlText = await response.text();
        window.apiSpec = jsyaml.load(yamlText);
        
        console.log('OpenAPI Spec Loaded:', window.apiSpec);
        
        // Update UI with spec data
        updateHeroSection(window.apiSpec);
        renderSidebar(window.apiSpec);
        renderStats(window.apiSpec);
        renderEndpoints(window.apiSpec);
        renderSchemas(window.apiSpec);
        
        // Re-init icons for dynamically added elements
        if (window.lucide) {
            lucide.createIcons();
        }
        
        showToast('OpenAPI specification loaded successfully', 'check-circle');
        
    } catch (error) {
        console.error('Error loading OpenAPI spec:', error);
        document.getElementById('sidebar-nav').innerHTML = `
            <div style="padding: 24px; color: var(--color-delete);">
                Failed to load API specification.
                <br><br>
                <small>Note: If running locally via file://, CORS will block fetch. Please use a local web server.</small>
            </div>
        `;
    }

    // Set up Global Event Listeners & Utilities
    setupGlobalListeners();
    setupUtilities();
    setupNavigation();
});

// Replace this URL with the actual GitHub repository URL
const GITHUB_REPO_URL = "https://github.com/naveengnaveen/api-documentation-viewer";

// --- Utility Setup Functions ---
function setupUtilities() {
    // Download OpenAPI Spec
    const downloadBtn = document.getElementById('btn-download-spec');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = 'openapi.yaml';
            link.download = 'student-management-api-openapi.yaml';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('OpenAPI specification downloaded', 'download');
        });
    }

    // View on GitHub
    const githubBtn = document.getElementById('btn-github');
    if (githubBtn) {
        githubBtn.addEventListener('click', () => {
            window.open(GITHUB_REPO_URL, '_blank');
        });
    }

    // Version Selector
    const versionSelect = document.getElementById('api-version');
    if (versionSelect) {
        versionSelect.addEventListener('change', (e) => {
            const newVersion = e.target.value;
            const heroVersion = document.getElementById('hero-version');
            if (heroVersion) {
                heroVersion.textContent = `Version: ${newVersion}`;
            }
            const topLabel = document.getElementById('top-api-label');
            if (topLabel) {
                const shortVersion = newVersion.replace(/^v/, '').split('.').slice(0, 2).join('.');
                topLabel.textContent = `API v${shortVersion}`;
            }
            showToast(`Version changed to ${newVersion}`, 'info');
        });
    }
}

function setupNavigation() {
    // Smooth scrolling for sidebar links
    const sidebarNav = document.getElementById('sidebar-nav');
    if (sidebarNav) {
        sidebarNav.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem && navItem.getAttribute('href') && navItem.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = navItem.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    // Adjust for fixed navbar height
                    const offset = 90;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = targetElement.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Highlight active item
                    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                    navItem.classList.add('active');
                    
                    // Automatically expand endpoint card if it's an endpoint
                    if (targetElement.classList.contains('endpoint-card')) {
                        targetElement.classList.add('expanded');
                    }
                }
            }
        });
    }
}

// --- Search Filter Logic ---
window.filterAndRenderApp = function(query) {
    if (!window.apiSpec) return;
    
    query = query.toLowerCase().trim();
    
    if (query === '') {
        renderSidebar(window.apiSpec);
        renderEndpoints(window.apiSpec);
        renderSchemas(window.apiSpec);
        const emptyState = document.getElementById('search-empty-state');
        if (emptyState) emptyState.style.display = 'none';
        
        // Update result count if it exists
        updateResultCount(0, false);
        return;
    }
    
    // Deep clone to avoid mutating original
    const filteredSpec = JSON.parse(JSON.stringify(window.apiSpec));
    let resultCount = 0;
    
    // Filter paths
    if (filteredSpec.paths) {
        Object.keys(filteredSpec.paths).forEach(path => {
            let hasMatchingMethod = false;
            
            Object.keys(filteredSpec.paths[path]).forEach(method => {
                const details = filteredSpec.paths[path][method];
                
                const matchesPath = path.toLowerCase().includes(query);
                const matchesMethod = method.toLowerCase().includes(query);
                const matchesSummary = (details.summary || '').toLowerCase().includes(query);
                const matchesDesc = (details.description || '').toLowerCase().includes(query);
                const matchesTags = details.tags && details.tags.some(t => t.toLowerCase().includes(query));
                
                if (matchesPath || matchesMethod || matchesSummary || matchesDesc || matchesTags) {
                    hasMatchingMethod = true;
                    resultCount++;
                } else {
                    delete filteredSpec.paths[path][method];
                }
            });
            
            if (!hasMatchingMethod) {
                delete filteredSpec.paths[path];
            }
        });
    }
    
    // Filter schemas
    if (filteredSpec.components && filteredSpec.components.schemas) {
        Object.keys(filteredSpec.components.schemas).forEach(schemaName => {
            if (schemaName.toLowerCase().includes(query)) {
                resultCount++;
            } else {
                delete filteredSpec.components.schemas[schemaName];
            }
        });
    }
    
    renderSidebar(filteredSpec, query);
    renderEndpoints(filteredSpec, query);
    renderSchemas(filteredSpec, query);
    
    // Handle Empty State
    const endpointsContainer = document.getElementById('endpoints-container');
    let emptyState = document.getElementById('search-empty-state');
    
    if (resultCount === 0) {
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.id = 'search-empty-state';
            emptyState.className = 'empty-state';
            endpointsContainer.appendChild(emptyState);
        }
        emptyState.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--color-text-muted);">
                <i data-lucide="search-x" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <h3>No matching endpoints found</h3>
                <p>Try adjusting your search query.</p>
            </div>
        `;
        emptyState.style.display = 'block';
    } else {
        if (emptyState) emptyState.style.display = 'none';
    }
    
    updateResultCount(resultCount, true);
    
    // Re-init icons
    if (window.lucide) lucide.createIcons();
};

function updateResultCount(count, isSearching) {
    let countIndicator = document.getElementById('search-count-indicator');
    if (!countIndicator) {
        countIndicator = document.createElement('div');
        countIndicator.id = 'search-count-indicator';
        countIndicator.style.cssText = 'position: absolute; right: 40px; top: 50%; transform: translateY(-50%); font-size: 11px; color: var(--color-text-muted); pointer-events: none;';
        
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            searchContainer.appendChild(countIndicator);
        }
    }
    
    if (isSearching) {
        countIndicator.textContent = `${count} found`;
        countIndicator.style.display = 'block';
    } else {
        countIndicator.style.display = 'none';
    }
}

// --- UI Rendering Functions ---

function updateHeroSection(spec) {
    if (spec.info) {
        document.getElementById('api-title').textContent = spec.info.title || 'API Documentation';
        document.getElementById('api-description').textContent = spec.info.description || '';
        
        let versionStr = spec.info.version || '1.0.0';
        if (!versionStr.startsWith('v')) {
            versionStr = 'v' + versionStr;
        }
        
        document.getElementById('hero-version').textContent = `Version: ${versionStr}`;
        
        const topLabel = document.getElementById('top-api-label');
        if (topLabel) {
            const shortVersion = versionStr.replace(/^v/, '').split('.').slice(0, 2).join('.');
            topLabel.textContent = `API v${shortVersion}`;
        }
        
        const versionSelect = document.getElementById('api-version');
        if (versionSelect) {
            let optionExists = Array.from(versionSelect.options).some(opt => opt.value === versionStr);
            if (!optionExists) {
                const opt = document.createElement('option');
                opt.value = versionStr;
                opt.textContent = versionStr;
                versionSelect.appendChild(opt);
            }
            versionSelect.value = versionStr;
        }
    }
    if (spec.servers && spec.servers.length > 0) {
        document.getElementById('hero-base-url').textContent = spec.servers[0].url;
    }
}

function renderSidebar(spec, query = '') {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = ''; // Clear loading
    
    // Static top links (only show when not searching)
    if (query === '') {
        nav.innerHTML += `
            <a href="#overview" class="nav-item">
                <i data-lucide="layout-dashboard"></i> Overview
            </a>
            <a href="#auth-section" class="nav-item">
                <i data-lucide="shield"></i> Authentication
            </a>
        `;
    }

    // Group by tags
    const groups = {};
    if (spec.paths) {
        Object.entries(spec.paths).forEach(([path, methods]) => {
            Object.entries(methods).forEach(([method, details]) => {
                const tag = (details.tags && details.tags[0]) || 'Default';
                if (!groups[tag]) groups[tag] = [];
                groups[tag].push({ path, method, ...details });
            });
        });
    }

    // Render grouped links
    Object.entries(groups).forEach(([tag, endpoints]) => {
        let groupHtml = `<div class="nav-group">
            <div class="nav-group-title">${tag}</div>`;
        
        endpoints.forEach(ep => {
            const endpointId = `ep-${ep.method}-${ep.path.replace(/\//g, '-').replace(/[{}]/g, '')}`;
            groupHtml += `
                <a href="#${endpointId}" class="nav-item" data-endpoint="${ep.path}">
                    <span class="method-badge ${ep.method}">${ep.method.toUpperCase()}</span>
                    <span>${ep.path}</span>
                </a>
            `;
        });
        
        groupHtml += `</div>`;
        nav.innerHTML += groupHtml;
    });

    // Add Schema link
    if (spec.components && spec.components.schemas && Object.keys(spec.components.schemas).length > 0) {
        nav.innerHTML += `
            <a href="#schemas-container" class="nav-item">
                <i data-lucide="database"></i> Schemas
            </a>
        `;
    }
}

function renderStats(spec) {
    let total = 0;
    const methodCounts = { get: 0, post: 0, put: 0, delete: 0, patch: 0 };
    
    if (spec.paths) {
        Object.values(spec.paths).forEach(methods => {
            Object.keys(methods).forEach(method => {
                total++;
                if (methodCounts[method] !== undefined) {
                    methodCounts[method]++;
                }
            });
        });
    }

    const grid = document.getElementById('stats-grid');
    grid.innerHTML = `
        <div class="stat-card">
            <span class="stat-title">Total Endpoints</span>
            <span class="stat-value">${total}</span>
        </div>
        <div class="stat-card">
            <span class="stat-title" style="color: var(--color-get)">GET</span>
            <span class="stat-value">${methodCounts.get}</span>
        </div>
        <div class="stat-card">
            <span class="stat-title" style="color: var(--color-post)">POST</span>
            <span class="stat-value">${methodCounts.post}</span>
        </div>
        <div class="stat-card">
            <span class="stat-title" style="color: var(--color-put)">PUT</span>
            <span class="stat-value">${methodCounts.put}</span>
        </div>
        <div class="stat-card">
            <span class="stat-title" style="color: var(--color-delete)">DELETE</span>
            <span class="stat-value">${methodCounts.delete}</span>
        </div>
    `;
}

function renderEndpoints(spec, query = '') {
    const container = document.getElementById('endpoints-container');
    container.innerHTML = '';
    
    // Add dummy Auth section (only if not searching or if it matches)
    if (query === '' || 'authentication'.includes(query) || 'bearer'.includes(query)) {
        const expandedClass = query !== '' ? 'expanded' : '';
        container.innerHTML += `
            <div id="auth-section" class="endpoint-card ${expandedClass}">
                <div class="endpoint-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <div class="endpoint-info">
                        <i data-lucide="shield" style="color: var(--color-accent)"></i>
                        <span class="endpoint-path">Authentication</span>
                    </div>
                    <i data-lucide="chevron-down"></i>
                </div>
                <div class="endpoint-body">
                    <p class="endpoint-description">Most endpoints require Bearer Token Authentication.</p>
                    <div class="code-block-wrapper">
                        <div class="code-header">
                            <span class="code-lang">HTTP Header</span>
                            <button class="copy-btn" onclick="event.preventDefault(); event.stopPropagation(); copyToClipboard('Authorization: Bearer <token>', 'Header copied to clipboard', 'Unable to copy header');"><i data-lucide="copy"></i> Copy</button>
                        </div>
                        <pre class="code-content">Authorization: Bearer &lt;token&gt;</pre>
                    </div>
                </div>
            </div>
        `;
    }

    if (spec.paths) {
        Object.entries(spec.paths).forEach(([path, methods]) => {
            Object.entries(methods).forEach(([method, details]) => {
                const endpointId = `ep-${method}-${path.replace(/\//g, '-').replace(/[{}]/g, '')}`;
                
                let paramsHtml = '';
                if (details.parameters && details.parameters.length > 0) {
                    paramsHtml = `
                        <h4 class="section-subtitle">Parameters</h4>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Located In</th>
                                        <th>Type</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${details.parameters.map(p => `
                                        <tr>
                                            <td>
                                                ${p.name}
                                                ${p.required ? '<span class="required-badge">*</span>' : ''}
                                            </td>
                                            <td>${p.in}</td>
                                            <td><span class="type-badge">${p.schema?.type || 'string'}</span></td>
                                            <td>${p.description || ''}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }

                let responsesHtml = '';
                if (details.responses) {
                    responsesHtml = `
                        <h4 class="section-subtitle">Responses</h4>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(details.responses).map(([code, res]) => `
                                        <tr>
                                            <td><span class="status-${code.startsWith('2') ? '200' : (code.startsWith('4') ? '400' : '500')}">${code}</span></td>
                                            <td>${res.description || ''}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }

                const fullUrl = `${spec.servers?.[0]?.url || ''}${path}`;
                const tryItOutHtml = `
                    <div class="try-out-panel">
                        <div class="panel-header">
                            <h4 class="section-subtitle" style="margin:0;">Try it out</h4>
                            <button class="btn btn-primary btn-sm btn-execute" data-method="${method.toUpperCase()}" data-url="${fullUrl}">
                                <i data-lucide="play"></i> Execute
                            </button>
                        </div>
                        <div class="input-group">
                            <label>Request URL</label>
                            <input type="text" class="input-control code-font" value="${fullUrl}" readonly>
                        </div>
                        
                        <div class="response-area" style="display: none; margin-top: 20px;">
                            <h4 class="section-subtitle">Server Response</h4>
                            <div class="response-status status-200">
                                <i data-lucide="check-circle"></i> 200 OK 
                                <span style="color: var(--color-text-muted); font-weight: normal; margin-left: auto;" class="response-time-label"></span>
                            </div>
                            <div class="code-block-wrapper">
                                <div class="code-header">
                                    <span class="code-lang">JSON</span>
                                </div>
                                <pre class="code-content mock-response-content">
                                </pre>
                            </div>
                            <p style="font-size: 12px; color: var(--color-text-muted); margin-top: 8px;">
                                <i data-lucide="info" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> 
                                Demo response — no real backend connected
                            </p>
                        </div>
                    </div>
                `;

                const isExpanded = query !== '' ? 'expanded' : '';
                const cardHtml = `
                    <div class="endpoint-card ${isExpanded}" id="${endpointId}">
                        <div class="endpoint-header" onclick="this.parentElement.classList.toggle('expanded')">
                            <div class="endpoint-info">
                                <span class="method-badge ${method}">${method.toUpperCase()}</span>
                                <span class="endpoint-path">${path}</span>
                                <span class="endpoint-summary">${details.summary || ''}</span>
                            </div>
                            <div class="endpoint-actions">
                                <button class="icon-btn copy-url-btn" data-url="${fullUrl}" title="Copy URL" onclick="event.preventDefault(); event.stopPropagation(); copyToClipboard('${fullUrl}', 'URL copied to clipboard', 'Unable to copy URL');">
                                    <i data-lucide="copy"></i>
                                </button>
                                <i data-lucide="chevron-down"></i>
                            </div>
                        </div>
                        <div class="endpoint-body">
                            <p class="endpoint-description">${details.description || 'No description provided.'}</p>
                            ${paramsHtml}
                            ${responsesHtml}
                            ${tryItOutHtml}
                        </div>
                    </div>
                `;
                container.innerHTML += cardHtml;
            });
        });
    }
}

function renderSchemas(spec, query = '') {
    if (!spec.components || !spec.components.schemas || Object.keys(spec.components.schemas).length === 0) {
        document.getElementById('schemas-heading').style.display = 'none';
        document.getElementById('schemas-list').innerHTML = '';
        return;
    }
    
    document.getElementById('schemas-heading').style.display = 'block';
    const container = document.getElementById('schemas-list');
    container.innerHTML = '';

    Object.entries(spec.components.schemas).forEach(([name, schema]) => {
        let propsHtml = '';
        if (schema.properties) {
            propsHtml = `
                <table class="table" style="margin-top: 16px;">
                    <thead><tr><th>Property</th><th>Type</th><th>Example</th></tr></thead>
                    <tbody>
                        ${Object.entries(schema.properties).map(([propName, details]) => `
                            <tr>
                                <td>${propName}</td>
                                <td><span class="type-badge">${details.type || 'string'} ${details.format ? `(${details.format})` : ''}</span></td>
                                <td class="code-font">${details.example !== undefined ? JSON.stringify(details.example) : ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        container.innerHTML += `
            <div class="schema-card">
                <div class="schema-name">{ } ${name}</div>
                <div style="color: var(--color-text-muted); font-size: 14px;">type: ${schema.type}</div>
                ${propsHtml}
            </div>
        `;
    });
}

// --- Global Event Listeners & Utilities ---

function setupGlobalListeners() {
    // Try It Out Execute Buttons
    document.addEventListener('click', (e) => {
        const execBtn = e.target.closest('.btn-execute');
        if (execBtn) {
            const panel = execBtn.closest('.try-out-panel');
            const responseArea = panel.querySelector('.response-area');
            const responseContent = panel.querySelector('.mock-response-content');
            
            // Show loading state
            const origHtml = execBtn.innerHTML;
            execBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Executing...';
            if(window.lucide) lucide.createIcons();
            
            // Simulate API call
            setTimeout(() => {
                execBtn.innerHTML = origHtml;
                responseArea.style.display = 'block';
                
                // Generate a mock response based on the path
                const url = execBtn.getAttribute('data-url');
                const method = execBtn.getAttribute('data-method');
                let mockData = { success: true, message: `Mock response for ${method} ${url}` };
                
                if (url.includes('/users')) {
                    if (method === 'GET' && !url.match(/users\/\d+/)) {
                        mockData = [
                            { id: 1, name: "John Doe", email: "john@example.com" },
                            { id: 2, name: "Jane Smith", email: "jane@example.com" }
                        ];
                    } else if (method === 'POST') {
                        mockData = { id: 3, status: "created" };
                    } else if (method === 'GET') {
                        mockData = { id: 1, name: "John Doe", email: "john@example.com" };
                    } else if (method === 'DELETE') {
                        mockData = null; // No Content
                    } else {
                        mockData = { success: true };
                    }
                } else if (url.includes('/health')) {
                    mockData = { status: "Operational", uptime: "99.98%", responseTime: 124 };
                } else if (url.includes('/products')) {
                    mockData = [{ id: 101, name: "Cloud Computing Textbook", price: 49.99, category: "Books" }];
                } else if (url.includes('/orders')) {
                    mockData = [{ id: 5001, userId: 1, total: 49.99, status: "Shipped" }];
                } else {
                    mockData = { success: true, message: `Mock response for ${method} ${url}` };
                }
                
                // Update response time
                const responseTimeLabel = panel.querySelector('.response-time-label');
                if (responseTimeLabel) {
                    responseTimeLabel.textContent = `Response time: ${Math.floor(Math.random() * 100 + 50)} ms`;
                }
                
                responseContent.textContent = mockData ? JSON.stringify(mockData, null, 2) : '';
                showToast('Request executed successfully', 'check');
                if(window.lucide) lucide.createIcons();
            }, 600);
        }
    });
}

// Toast System
window.showToast = function(message, iconName = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <i data-lucide="${iconName}" class="toast-icon"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// Clipboard System
window.copyToClipboard = function(text, successMsg = 'Copied to clipboard', errorMsg = 'Unable to copy URL') {
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg, 'copy-check');
    }).catch(err => {
        console.error('Failed to copy', err);
        showToast(errorMsg, 'alert-circle');
    });
};
