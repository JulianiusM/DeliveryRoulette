export const usersRouteRenderData = [
    {
        description: 'renders the profile page for the profile route',
        path: '/profile',
        method: 'get',
        sessionUser: {id: 1},
        expectedView: 'users/profile',
    },
];

export const usersSettingsRouteData = [
    {
        description: 'flashes informational notices before redirecting after settings save',
        path: '/settings',
        method: 'post',
        requestBody: {defaultLocationLabel: 'Home'},
        notices: [
            'The location was saved, but coordinates could not be resolved right now. Retry later or enter them manually.',
        ],
        expectedRedirect: '/users/settings?locationId=loc-home',
        expectedSuccessMessage: 'Settings saved successfully',
    },
];
