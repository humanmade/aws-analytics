import React from 'react';

import TestPanel from './components/panel';

const { addFilter } = wp.hooks;

/**
 * Register a new experiment type.
 *
 * @param {object} experiment Experiement options.
 * @param {int} experiment.id Experiement test ID.
 * @param {string} experiment.title Experiement test title.
 * @param {React.ReactNode} experiment.component Experiement test panel field component.
 * @param {object} experiment.dispatcher Experiement test panel dispatch handler.
 * @param {object} experiment.selector Experiement test panel select handler.
 */
export const registerExperiment = ( { id, title, component, dispatcher, selector } ) => {
	// Hooks namespace
	const namespace = `altis.experiments.${ id }`;

	// Register the panel for the experiement.
	addFilter( 'altis.experiments.panels', namespace, panels => (
		[
			...panels,
			props => (
				<TestPanel
					testId={ id }
					title={ title }
					{ ...props }
				/>
			),
		]
	) );

	// Register the variant custom field for the experiement.
	addFilter( `altis.experiments.${ id }.component`, namespace, () => component );

	// Register the revert callback for the experiement.
	addFilter( `altis.experiments.${ id }.data.dispatchers`, namespace, ( dispatchers, dispatch ) => {
		return {
			...dispatchers,
			...dispatcher( dispatch ),
		};
	} );

	// Register the data select handler for values specific to this test.
	addFilter( `altis.experiments.${ id }.data.selectors`, namespace, ( selectors, select ) => {
		return {
			...selectors,
			...selector( select ),
		};
	} );
};
