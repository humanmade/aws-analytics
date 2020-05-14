// Audience UI Application.
import React from 'react';
import ReactDOM from 'react-dom';

import { Edit, Manager, Select } from './ui';
import Estimate from './ui/components/estimate';

// Import the data store file directly.
import './ui/data';

// Export select component as an audience picker.
window.Altis = window.Altis || {};
window.Altis.Analytics = window.Altis.Analytics || {};
window.Altis.Analytics.components = window.Altis.Analytics.components || {};
window.Altis.Analytics.components.AudiencePicker = Select;

// Get the audience manager placeholder.
const AudienceManager = document.getElementById( 'altis-audience-manager' );

// Is our audience UI placeholder present?
if ( AudienceManager ) {
	// Mount audience react app.
	ReactDOM.render(
		<Manager />,
		AudienceManager
	);
}

// Get the audience UI placeholder.
const AudienceUI = document.getElementById( 'altis-analytics-audience-ui' );

// Is our audience UI placeholder present?
if ( AudienceUI ) {
	// Mount audience react app.
	ReactDOM.render(
		<Edit
			postId={ AudienceUI.dataset.postId }
		/>,
		AudienceUI
	);
}

// Get the audience UI placeholder.
const AudienceEstimates = document.querySelectorAll( '.altis-analytics-audience-estimate' );

// Render any estimate blocks on page.
AudienceEstimates.forEach( element => {
	// Mount audience react app.
	ReactDOM.render(
		<Estimate
			audience={ JSON.parse( element.dataset.audience || null ) }
			horizontal
		/>,
		element
	);
} );
