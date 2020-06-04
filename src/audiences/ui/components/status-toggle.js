import React from 'react';

const { ToggleControl } = wp.components;
const { __ } = wp.i18n;

const StatusToggle = props => {
	const {
		disabled,
		status,
		onChange,
	} = props;

	const helpText = status === 'publish'
		? __( 'Audience is active', 'altis-analytics' )
		: __( 'Audience is inactive', 'altis-analytics' );

	return (
		<ToggleControl
			checked={ status === 'publish' }
			disabled={ disabled }
			help={ helpText }
			label={ __( 'Active', 'altis-analytics' ) }
			onChange={ onChange }
		/>
	);
};

export default StatusToggle;
