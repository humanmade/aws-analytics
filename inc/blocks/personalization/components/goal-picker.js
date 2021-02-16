import React from 'react';

const { SelectControl } = wp.components;
const { __ } = wp.i18n;

const registeredGoals = window.Altis.Analytics.Experiments.Goals || {};

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
			onChange={ onChange }
			options={ options }
			value={ goal }
		/>
	);
};

export default GoalPicker;
