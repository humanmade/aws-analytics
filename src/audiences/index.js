// Audience UI Application.
import React from 'react';
import ReactDOM from 'react-dom';

import Edit from './edit';
import Estimate from './edit/components/estimate';

// Get the audience UI placeholder.
const AudienceUI = document.getElementById( 'altis-analytics-audience-ui' );

// Is our audience UI placeholder present?
if ( AudienceUI ) {
	// Mount audience react app.
	ReactDOM.render(
		<Edit
			postId={ AudienceUI.dataset.postId }
			audience={ JSON.parse( AudienceUI.dataset.audience || null ) }
			fields={ JSON.parse( AudienceUI.dataset.fields || [] ) }
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
