import React from 'react';

const { SelectControl } = wp.components;
const { __ } = wp.i18n;

const registeredGoals = window.Altis.Analytics.Experiments.Goals || {};

/**
 * Dropdown goal selection component.
 *
 * @param {React.ComponentProps} props The component props.
 * @param {string} props.goal Currently selected goal.
 * @param {Function} props.onChange Callback for value changes.
 * @returns {React.ReactNode} The goal picker component.
 */
const GoalPicker = ( { goal, onChange } ) => {
	const goals = Object.entries( registeredGoals );

	if ( goals.length < 1 ) {
		return null;
	}

	const options = [
		{
			label: __( 'Impressions', 'altis-experiments' ),
			value: '',
		},
		...goals.map( ( [ name, data ] ) => ( {
			label: data.label || name,
			value: name,
		} ) ),
	];

	return (
		<SelectControl
			label={ __( 'Choose a conversion goal', 'altis-experiments' ) }
			options={ options }
			value={ goal }
			onChange={ onChange }
		/>
	);
};

export default GoalPicker;
