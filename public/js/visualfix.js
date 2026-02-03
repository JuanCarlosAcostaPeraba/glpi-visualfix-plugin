/**
 * Visual Fixes for GLPI 11 Kanban
 * 
 * Strategy: "JSON-Aware"
 * 1. AJAX Monkey-patch: Capture metadata from kanban.php?action=refresh.
 * 2. JSON Filtering: Filter DOM elements based on captured metadata.
 * 3. Tag Rendering: Manually draw missing tags on cards.
 */

// Inject CSS for forced hiding
const injectStyle = () => {
    if (document.getElementById('visualfix-css')) return;
    const style = document.createElement('style');
    style.id = 'visualfix-css';
    style.textContent = `
        .visualfix-filtered-out { display: none !important; }
        .visualfix-tag-badge { 
            font-size: 0.7rem; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
};
injectStyle();

// AJAX Monkey-patch to capture Kanban JSON data
if (!window.visualfixAjaxPatched) {
    const originalAjax = jQuery.ajax;
    jQuery.ajax = function () {
        const promise = originalAjax.apply(this, arguments);
        const args = arguments[0];
        if (args && args.url && args.url.includes('kanban.php') && args.data && args.data.action === 'refresh') {
            promise.then(function (data) {
                window.lastKanbanData = data;
                // Re-apply filtering when new data arrives
                setTimeout(applyManualTagFilter, 100);
            });
        }
        return promise;
    };
    window.visualfixAjaxPatched = true;
}

const fixSuggestions = () => {
    const popovers = document.querySelectorAll('.popover.show');
    popovers.forEach(popover => {
        const elements = popover.querySelectorAll('.list-group-item, .list-group-item span, .list-group-item div');
        elements.forEach(el => {
            if (el.children.length > 0 && !el.classList.contains('list-group-item')) return;
            if (el.textContent.includes('<i class=') || el.textContent.includes('&lt;i class=')) {
                const temp = document.createElement('div');
                temp.innerHTML = el.textContent;
                el.innerHTML = temp.textContent;
                if (el.textContent.includes('<i class=')) el.innerHTML = el.textContent;
            }
        });
    });
};

const repairBrokenTokens = () => {
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
        const tags = input.querySelectorAll('.search-input-tag-value');
        tags.forEach(tag => {
            if (tag.innerHTML.includes('&lt;i class=')) {
                tag.innerHTML = tag.innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            }
        });
    });
};

/**
 * Enhanced Manual filtering logic: Uses JSON metadata
 */
const applyManualTagFilter = () => {
    const select = document.querySelector('.visualfix-tags-select');
    if (!select || !jQuery) return;

    // Fallback to DOM scraping if JSON is not available yet
    const useJson = !!window.lastKanbanData;
    const $select = jQuery(select);
    const selectedData = $select.select2('data') || [];
    const selectedNames = selectedData.map(d => d.text.toLowerCase().trim());

    // Create Metadata Map if using JSON
    const metadataMap = {};
    if (useJson) {
        Object.values(window.lastKanbanData).forEach(col => {
            if (col.items) {
                Object.values(col.items).forEach(item => {
                    metadataMap[item.id] = (item._metadata && item._metadata.tags) ? Object.values(item._metadata.tags).map(t => t.toLowerCase().trim()) : [];
                });
            }
        });
    }

    jQuery('.kanban-item').each(function () {
        const $card = jQuery(this);
        const id = $card.attr('id');

        if (selectedNames.length === 0) {
            $card.removeClass('visualfix-filtered-out');
            return;
        }

        // 1. Get Tags for this card
        let cardTags = [];
        if (useJson && metadataMap[id]) {
            cardTags = metadataMap[id];
        } else {
            // DOM Scraper Fallback
            $card.find('.tag_choice, .badge, .kanban-plugin-content span').each(function () {
                const text = jQuery(this).text().trim().toLowerCase();
                if (text && text.length < 30 && !text.includes(':') && !jQuery(this).hasClass('kanban-item-title')) {
                    cardTags.push(text);
                }
            });
        }

        // 2. Filter Logic
        const allMatched = selectedNames.every(name => cardTags.includes(name));
        if (!allMatched) {
            $card.addClass('visualfix-filtered-out');
        } else {
            $card.removeClass('visualfix-filtered-out');
        }

        // 3. Render Tags Badge (if not already there and we have them in metadata)
        if (useJson && cardTags.length > 0 && $card.find('.visualfix-tags-rendered').length === 0) {
            const $container = $card.find('.kanban-item-content, .kanban-plugin-content').first();
            if ($container.length) {
                const $tagsDiv = $('<div class="visualfix-tags-rendered mt-2 d-flex flex-wrap gap-1"></div>');
                cardTags.forEach(tagName => {
                    $tagsDiv.append(`<span class="badge bg-blue-lt visualfix-tag-badge">${tagName}</span>`);
                });
                $container.prepend($tagsDiv);
            }
        }
    });
};

const addTagsFilterToToolbar = () => {
    const kanban = document.querySelector('.kanban, #kanban-app');
    if (!kanban) return;
    const toolbar = document.querySelector('.kanban-toolbar');
    if (!toolbar || toolbar.querySelector('.visualfix-tags-filter')) return;

    const container = document.createElement('div');
    container.className = 'visualfix-tags-filter me-2';
    container.style.minWidth = '200px';

    const select = document.createElement('select');
    select.className = 'form-select select2 visualfix-tags-select';
    select.multiple = true;
    select.dataset.placeholder = "Filtrar por etiquetas...";

    container.appendChild(select);
    const searchInputEl = toolbar.querySelector('.search-input');
    if (searchInputEl) toolbar.insertBefore(container, searchInputEl); else toolbar.appendChild(container);

    const getIdealTextColor = (backgroundHex) => {
        if (!backgroundHex) return 'inherit';
        const hex = backgroundHex.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 125 ? 'black' : 'white';
    };

    if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
        $(select).select2({
            width: '100%',
            dropdownParent: $(container),
            ajax: {
                url: CFG_GLPI.root_doc + '/plugins/visualfix/ajax/tags.php',
                dataType: 'json',
                delay: 250,
                data: (params) => ({ searchText: params.term || '', page: params.page }),
                processResults: (data) => ({ results: data.results }),
                cache: true
            },
            templateResult: (data) => {
                if (!data.id || data.loading) return data.text;
                return $('<span class="badge" style="background-color:' + (data.color || '#DDD') + '; color:' + getIdealTextColor(data.color) + '">' + data.text + '</span>');
            },
            templateSelection: (data) => {
                if (!data.id) return data.text;
                return $('<span class="badge" style="background-color:' + (data.color || '#DDD') + '; color:' + getIdealTextColor(data.color) + '; margin-right: 5px;">' + data.text + '</span>');
            }
        });

        $(select).on('change', function () {
            applyManualTagFilter();
            // Trigger a refresh call to ensure Vue and our AJAX patch stay in sync if tags changed
            const refreshBtn = document.querySelector('.kanban-toolbar .ti-refresh, .kanban-toolbar .refresh-search');
            if (refreshBtn) refreshBtn.click();
        });
    }
};

const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    mutations.forEach(m => { if (m.addedNodes.length || m.type === 'childList') shouldUpdate = true; });
    if (shouldUpdate) {
        fixSuggestions();
        repairBrokenTokens();
        addTagsFilterToToolbar();
        applyManualTagFilter();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener('DOMContentLoaded', () => {
    fixSuggestions();
    repairBrokenTokens();
    addTagsFilterToToolbar();
});
