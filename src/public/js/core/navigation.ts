/**
 * Core navigation utilities
 * Handles navigation state and highlighting
 */

/**
 * Set current navigation location in navbar as active
 * Highlights the current page in the navigation menu
 */
export function setCurrentNavLocation(): void {
    const path = window.location.pathname;

    // Map path prefixes to nav link selectors
    const navMappings: [string, string][] = [
        ['/suggest', 'a.nav-link[href="/suggest"]'],
        ['/restaurants', 'a.nav-link[href="/restaurants"]'],
        ['/users/dashboard', 'a.nav-link[href="/users/dashboard"]'],
        ['/users/profile', 'a.dropdown-item[href="/users/profile"]'],
        ['/users/settings', 'a.dropdown-item[href="/users/settings"]'],
        ['/import', 'a.dropdown-item[href="/import"]'],
        ['/providers', 'a.dropdown-item[href="/providers"]'],
        ['/sync/jobs', 'a.dropdown-item[href="/sync/jobs"]'],
        ['/sync/alerts', 'a.dropdown-item[href="/sync/alerts"]'],
        ['/help', 'a.dropdown-item[href="/help"]'],
        ['/users/login', 'a.nav-link[href="/users/login"]'],
        ['/users/register', 'a.nav-link[href="/users/register"]'],
    ];

    if (path === '/') {
        const brandLink = document.querySelector('a.navbar-brand');
        if (brandLink) {
            brandLink.classList.add('active');
        }
        return;
    }

    for (const [prefix, selector] of navMappings) {
        if (path === prefix || path.startsWith(prefix + '/')) {
            const link = document.querySelector(selector);
            if (link) {
                link.classList.add('active');

                const parentDropdownToggle = link.closest('.dropdown')?.querySelector('.nav-link.dropdown-toggle');
                if (parentDropdownToggle) {
                    parentDropdownToggle.classList.add('active');
                }
            }
            return;
        }
    }
}

/**
 * Initialize entity list filtering
 * Adds search functionality to entity lists
 * @param container Optional container element to search within (defaults to document)
 * @param options Optional configuration for selectors
 */
export function initEntityLists(
    container: HTMLElement | Document = document,
    options: {
        sectionSelector?: string;
        inputSelector?: string;
        listSelector?: string;
        countSelector?: string;
        itemSelector?: string;
    } = {}
): void {
    const {
        sectionSelector = '[data-filter="section"]',
        inputSelector = 'input[type="search"]',
        listSelector = '.js-list',
        countSelector = '.js-count',
        itemSelector = '.list-group-item'
    } = options;

    container.querySelectorAll(sectionSelector).forEach(sec => {
        const input = sec.querySelector(inputSelector) as HTMLInputElement;
        const list = sec.querySelector(listSelector);
        const count = sec.querySelector(countSelector);
        if (!input || !list || !count) return;

        const items = Array.from(list.querySelectorAll(itemSelector));
        const total = items.length;

        const update = () => {
            const q = (input.value || '').trim().toLowerCase();
            let visible = 0;
            items.forEach(li => {
                const txt = (li.getAttribute('data-search') || li.textContent || '').toLowerCase();
                const show = !q || txt.includes(q);
                li.classList.toggle('d-none', !show);
                if (show) visible++;
            });
            count.textContent = `${visible}/${total}`;
        };

        // mark section for script
        sec.setAttribute('data-filter', 'section');
        input.addEventListener('input', update);
        update();
    });
}
