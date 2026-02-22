/**
 * E2E test data for diet override workflows.
 */

export const overrideData = {
    supported: 'true',
    notes: 'Verified by E2E test',
};

export const selectors = {
    dietTagIdSelect: 'select[name="dietTagId"]',
    supportedSelect: 'select[name="supported"]',
    notesInput: 'input[name="notes"]',
    submitButton: 'button[type="submit"]',
    overrideDeleteButton: 'form[action*="diet-overrides"] button[type="submit"].btn-outline-danger',
};
