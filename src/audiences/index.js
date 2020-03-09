// Audience UI Application.
import React from 'react';
import ReactDOM from 'react-dom';
import Edit from './edit';

// Get the audience UI placeholder.
const AudienceUI = document.getElementById( 'altis-analytics-audience-ui' );

// Is our audience UI placeholder present?
if ( AudienceUI ) {
	// Mount audience react app.
	ReactDOM.render( <Edit
		audience={ JSON.parse( AudienceUI.dataset.audience || null ) }
		fields={ JSON.parse( AudienceUI.dataset.fields || [] ) }
	/>, AudienceUI );
}
