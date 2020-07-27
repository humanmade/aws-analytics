import React from 'react';
import ReactDOM from 'react-dom';

import Selector from './components/Selector';

Altis.Analytics.onReady( function () {
	const container = document.getElementById( 'wp-admin-bar-altis-analytics-preview' );
	if ( ! container ) {
		return;
	}

	// Empty the element, then render.
	while ( container.firstChild ) {
		container.removeChild( container.firstChild );
	}

	ReactDOM.render(
		<Selector />,
		container
	);
} );
