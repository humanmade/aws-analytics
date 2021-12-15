const { addFilter } = wp.hooks;

/**
 * Register a new experiment type.
 *
 * @param {object} experiment Experiement options.
 * @param {int} experiment.id Experiement test ID.
 * @param {string} experiment.title Experiement test title.
 * @param {string} experiment.singleTitle Experiement test single entry title.
 * @param {React.ReactNode} experiment.component Experiement test panel field component.
 * @param {object} experiment.dispatcher Experiement test panel dispatch handler.
 * @param {object} experiment.selector Experiement test panel select handler.
 */
export const registerExperiment = experiment => {
	// Register the panel for the experiement.
	addFilter( 'altis.experiments.experiments', `altis.experiments.${ experiment.id }`, experiments => [ ...experiments, experiment ] );
};
