import React from 'react';

const {
	PanelBody,
	RangeControl,
	ToggleControl,
} = wp.components;
const { __ } = wp.i18n;

/**
 * Test settings panel.
 *
 * @param {React.ComponentProps} props The component props.
 * @param {boolean} props.paused Whether the test is running.
 * @param {number} props.percentage Percentage of traffic to include in test.
 * @param {Function} props.onSetPaused Updates the paused status of the test.
 * @param {Function} props.onSetPercentage Updates the traffic percentage.
 * @returns {React.ReactNode} Test settings panel.
 */
const TestSettings = ( {
	paused,
	percentage,
	onSetPaused,
	onSetPercentage,
} ) => {
	return (
		<PanelBody initialOpen={ false } title={ __( 'Advanced settings', 'altis-analytics' ) }>
			<ToggleControl
				checked={ paused }
				label={ __( 'Paused', 'altis-analytics' ) }
				onChange={ () => onSetPaused( ! paused ) }
			/>
			<RangeControl
				help={ __( 'The amount of traffic to include in the test. If the test might be risky use a lower number. A higher number will yield results more quickly.', 'altis-analytics' ) }
				label={ __( 'Traffic percentage', 'altis-analytics' ) }
				max={ 100 }
				min={ 0 }
				value={ percentage }
				onChange={ onSetPercentage }
			/>
		</PanelBody>
	);
};

export default TestSettings;
