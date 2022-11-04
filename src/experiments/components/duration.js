import React, { useState, useEffect } from 'react';

import { getDurationString } from '../../utils';

/**
 * Shows the test duration and counts down.
 *
 * @param {React.ComponentProps} props The duration props.
 * @returns {React.ReactNode} Duration component.
 */
const Duration = props => {
	const { time = 0, interval = 60000 } = props;
	const [ duration, setDuration ] = useState( time );

	useEffect( () => {
		if ( ! interval ) {
			return;
		}

		const timer = setInterval( () => {
			setDuration( duration - interval );
		}, interval );

		return function cleanup() {
			clearInterval( timer );
		};
	} );

	if ( duration <= 0 ) {
		return null;
	}

	return (
		<span>{ getDurationString( duration ) }</span>
	);
};

export default Duration;
