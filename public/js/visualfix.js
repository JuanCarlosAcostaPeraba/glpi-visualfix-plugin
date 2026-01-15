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

const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    mutations.forEach(mutation => {
        if (mutation.addedNodes.length || mutation.type === 'childList' || mutation.type === 'characterData') {
            shouldUpdate = true;
        }
    });

    if (shouldUpdate) {
        fixSuggestions();
        repairBrokenTokens();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});

document.addEventListener('DOMContentLoaded', () => {
    fixSuggestions();
    repairBrokenTokens();
});
