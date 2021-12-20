const { applyFilters, doAction } = wp.hooks;

/**
 * Return formatted object with defined sidebar tests coming from the backend.
 *
 * @returns {object} Tests object.
 */
export const getSidebarTests = () => {
	const input = window.Altis.Analytics.Experiments.PostABTests || {};
	const tests = {};

	for ( let id in input ) {
		const test = input[ id ];

		/* eslint-disable jsdoc/require-jsdoc */
		tests[ id ] = applyFilters( `altis.experiments.sidebar.test.${ id }`, {
			id,
			title: test.label,
			singleTitle: test.singular_label,
			component: () => ( <></> ),
			displayValue: value => value,
			dispatcher: () => ( {} ),
			selector: () => ( {} ),
		}, test );
		/* eslint-enable */
	}

	doAction( 'altis.experiments.sidebar.tests.loaded', tests );

	return tests;
};

export const context = wp.element.createContext();
