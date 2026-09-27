/*
 * Search Functionality
 * Hooks into the parsed OpenAPI object search logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('global-search');
    const clearBtn = document.getElementById('clear-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            
            if (clearBtn) {
                clearBtn.style.display = query.trim().length > 0 ? 'block' : 'none';
            }
            
            if (window.filterAndRenderApp) {
                window.filterAndRenderApp(query);
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            searchInput.focus();
            
            if (window.filterAndRenderApp) {
                window.filterAndRenderApp('');
            }
        });
    }
});
