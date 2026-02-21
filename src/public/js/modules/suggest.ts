/**
 * Suggestion wizard module
 * Handles AJAX-based suggestion requests and inline result display
 */

import {post} from '../core/http';
import {showInlineAlert} from '../shared/alerts';
import {setCurrentNavLocation} from '../core/navigation';

/** Initialise the suggest page. */
export function init(): void {
    setCurrentNavLocation();
    const suggestBtn = document.getElementById('suggestBtn') as HTMLButtonElement | null;
    const rerollBtn = document.getElementById('rerollBtn') as HTMLButtonElement | null;

    if (suggestBtn) suggestBtn.addEventListener('click', () => runSuggestion());
    if (rerollBtn) rerollBtn.addEventListener('click', () => runSuggestion());
}

async function runSuggestion(): Promise<void> {
    const resultSection = document.getElementById('suggestionResult')!;
    const emptyState = document.getElementById('emptyState')!;
    const spinner = document.getElementById('suggestionSpinner')!;

    // Gather filters from the form
    const dietCheckboxes = document.querySelectorAll<HTMLInputElement>('input[name="dietTagIds"]:checked');
    const dietTagIds = Array.from(dietCheckboxes).map(cb => cb.value);
    const cuisineIncludes = (document.getElementById('cuisineIncludes') as HTMLInputElement)?.value || '';
    const cuisineExcludes = (document.getElementById('cuisineExcludes') as HTMLInputElement)?.value || '';

    // Show spinner, hide previous result
    spinner.classList.remove('d-none');
    resultSection.classList.add('d-none');
    emptyState.classList.add('d-none');

    try {
        const data = await post('/suggest', {dietTagIds, cuisineIncludes, cuisineExcludes});
        renderResult(data);
        resultSection.classList.remove('d-none');
    } catch (err: any) {
        emptyState.classList.add('d-none');
        showInlineAlert('info', err.message || 'No restaurants match your filters.');
    } finally {
        spinner.classList.add('d-none');
    }
}

function renderResult(data: any): void {
    const r = data.restaurant;
    const reason = data.reason || {};
    const matchedDiets: any[] = reason.matchedDiets || [];

    // Restaurant name & link
    document.getElementById('resultName')!.textContent = r.name;
    (document.getElementById('resultLink') as HTMLAnchorElement).href = `/restaurants/${r.id}`;

    // Address
    let addr = r.addressLine1;
    if (r.addressLine2) addr += `\n${r.addressLine2}`;
    addr += `\n${r.postalCode} ${r.city}`;
    if (r.country) addr += `\n${r.country}`;
    document.getElementById('resultAddress')!.textContent = addr;

    // Diet matches
    const dietContainer = document.getElementById('resultDiets')!;
    dietContainer.innerHTML = '';
    if (matchedDiets.length > 0) {
        for (const diet of matchedDiets) {
            const row = document.createElement('div');
            row.className = 'd-flex align-items-center mb-1';
            const icon = diet.supported
                ? '<i class="bi bi-check-circle-fill text-success me-2"></i>'
                : '<i class="bi bi-x-circle-fill text-danger me-2"></i>';
            let badge = '';
            if (diet.source === 'override') badge = '<span class="badge text-bg-primary ms-2">Manual Override</span>';
            else if (diet.source === 'inference') badge = '<span class="badge text-bg-warning ms-2">Heuristic</span>';
            row.innerHTML = `${icon}<span>${escapeHtml(diet.dietTagLabel)}</span>${badge}`;
            dietContainer.appendChild(row);
        }
    } else {
        dietContainer.innerHTML = '<p class="text-white-50 mb-0">No diet filters applied.</p>';
    }

    // Candidate count
    document.getElementById('resultCandidates')!.textContent =
        `Selected from ${reason.totalCandidates} matching restaurant(s).`;
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Expose to global scope
if (!window.DeliveryRouletteApp) window.DeliveryRouletteApp = {};
window.DeliveryRouletteApp.init = init;
