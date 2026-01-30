/**
 * Visual Fixes for GLPI 11 Kanban
 * 
 * Focus: Rendering icons in search suggestions correctly and repairing split tokens.
 */

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

                if (el.textContent.includes('<i class=')) {
                    el.innerHTML = el.textContent;
                }
            }
        });
    });
};

const repairBrokenTokens = () => {
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
        // Fix for already applied tags (badges)
        const tags = input.querySelectorAll('.search-input-tag-value');
        tags.forEach(tag => {
            if (tag.innerHTML.includes('&lt;i class=')) {
                tag.innerHTML = tag.innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            }
        });

        // Split token repair logic
        const nodes = Array.from(input.childNodes);
        for (let i = 0; i < nodes.length; i++) {
            const currentVal = nodes[i];
            const next = nodes[i + 1];

            if (!next) continue;

            const nextText = next.textContent.trim();

            if (currentVal && (currentVal.textContent.includes('<i') || currentVal.textContent.includes('&lt;i'))) {
                if (nextText.startsWith('class=') || nextText.startsWith(' class=')) {
                    const fullLabel = currentVal.textContent + nextText;
                    const temp = document.createElement('div');
                    temp.innerHTML = fullLabel;

                    const bTag = currentVal.querySelector('b');
                    const tagKey = bTag ? bTag.outerHTML + ':' : '';

                    let cleanValue = temp.textContent;
                    if (bTag) {
                        cleanValue = cleanValue.replace(bTag.textContent + ':', '').trim();
                    }

                    currentVal.innerHTML = tagKey + cleanValue;
                    next.remove();
                    i--;
                }
            }
        }
    });
};

const addTagsFilterToToolbar = () => {
    // 1. Check if we are in a Project Kanban
    const kanban = document.querySelector('.kanban');
    if (!kanban) return;

    // Determine if it's a project kanban (via dataset or URL)
    const isProjectKanban = (kanban.dataset.itemtype === 'Project') ||
        (window.location.href.includes('project') && !window.location.href.includes('projecttype'));

    if (!isProjectKanban) return;

    const toolbar = document.querySelector('.kanban-toolbar');
    if (!toolbar || toolbar.querySelector('.visualfix-tags-filter')) return;

    console.log('VisualFix: Injecting tags filter into toolbar');

    // 2. Create the filter container
    const container = document.createElement('div');
    container.className = 'visualfix-tags-filter me-2';
    // Style it to be compact but usable
    container.style.minWidth = '200px';
    container.style.zIndex = '1000';

    const select = document.createElement('select');
    select.className = 'form-select select2 visualfix-tags-select';
    select.name = 'visualfix-tags-filter-select';
    select.multiple = true;
    select.dataset.placeholder = "Filtrar por etiquetas...";

    container.appendChild(select);

    // Inject before the search input
    const searchInputEl = toolbar.querySelector('.search-input');
    if (searchInputEl) {
        toolbar.insertBefore(container, searchInputEl);
    } else {
        // Fallback for different toolbar structures
        const anySearch = toolbar.querySelector('[data-search-tokenizer], .search-bar, .input-group');
        if (anySearch) {
            toolbar.insertBefore(container, anySearch);
        } else {
            toolbar.appendChild(container);
        }
    }

    // 3. Initialize Select2
    if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
        $(select).select2({
            width: '100%',
            dropdownParent: $(container),
            ajax: {
                url: CFG_GLPI.root_doc + '/plugins/visualfix/ajax/tags.php',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    console.log('VisualFix: Tag search request with term:', params.term);
                    return {
                        searchText: params.term || '',
                        page: params.page
                    };
                },
                processResults: function (data, params) {
                    console.log('VisualFix: Tag search results received:', data);
                    params.page = params.page || 1;
                    return {
                        results: data.results,
                        pagination: {
                            more: (data.pagination && data.pagination.more) ? true : false
                        }
                    };
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.error('VisualFix: Tag AJAX error!', {
                        status: jqXHR.status,
                        statusText: textStatus,
                        error: errorThrown,
                        responseText: jqXHR.responseText
                    });
                    try {
                        const json = JSON.parse(jqXHR.responseText);
                        console.error('VisualFix: Parsed server error:', json);
                    } catch (e) {
                        console.error('VisualFix: Could not parse error response as JSON');
                    }
                },
                cache: true
            }
        });

        // 4. Handle change
        $(select).on('change', function () {
            const values = $(this).val();
            console.log('VisualFix: Tags selected in dropdown:', values);

            let searchInput = document.querySelector('.search-input');
            if (!searchInput) {
                console.warn('VisualFix: .search-input not found. Looking for alternatives...');
                searchInput = document.querySelector('[data-search-tokenizer], .kanban-search, .search-bar');
            }

            if (!searchInput) {
                console.error('VisualFix: No search input found at all');
                return;
            }

            // 1. Remove existing tag: tokens from the search bar
            const existingTags = searchInput.querySelectorAll('.search-input-tag[data-tag="tag"]');
            console.log('VisualFix: Removing existing tag tokens:', existingTags.length);
            existingTags.forEach(el => el.remove());

            // 2. Add new tags by "typing" into the search bar
            if (values && values.length > 0) {
                const selectedData = $(this).select2('data');
                const tagInputs = searchInput.querySelectorAll('.search-input-tag-input');
                const tagInput = tagInputs[tagInputs.length - 1]; // Get the last one (active input)

                if (tagInput) {
                    let fullString = "";
                    selectedData.forEach(data => {
                        const tag_name = data.text;
                        const tag_value_quoted = tag_name.includes(' ') ? `"${tag_name}"` : tag_name;
                        fullString += `tag:${tag_value_quoted} `;
                    });

                    console.log('VisualFix: Injecting string into search bar:', fullString);

                    // Focus and set text
                    tagInput.focus();
                    tagInput.innerText = fullString;

                    // Trigger native input event to ensure GLPI/Vue detects change
                    tagInput.dispatchEvent(new Event('input', { bubbles: true }));

                    // Trigger native Enter keydown
                    const enterEvent = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    });
                    tagInput.dispatchEvent(enterEvent);

                    // Also try to trigger 'change' on the search input container
                    searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                    // Force GLPI result_change if needed (legacy compatibility)
                    $(searchInput).trigger('result_change');

                    console.log('VisualFix: Events dispatched for tags');
                } else {
                    console.warn('VisualFix: .search-input-tag-input not found inside search bar');
                    // Extreme fallback: set text and trigger globally
                    const inputWrapper = searchInput.querySelector('.search-input-tag-input');
                    if (inputWrapper) {
                        inputWrapper.innerText = fullString;
                        $(inputWrapper).trigger('keydown', { keyCode: 13 });
                    }
                }
            } else {
                // If cleared, just trigger result change
                console.log('VisualFix: Filter cleared, triggering result_change');
                $(searchInput).trigger('result_change');
            }
        });
    }
};

const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length || mutation.type === 'childList') {
            shouldUpdate = true;
        }
    });

    if (shouldUpdate) {
        fixSuggestions();
        repairBrokenTokens();
        addTagsFilterToToolbar();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

document.addEventListener('DOMContentLoaded', () => {
    fixSuggestions();
    repairBrokenTokens();
    addTagsFilterToToolbar();
});
