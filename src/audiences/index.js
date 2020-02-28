// Audience UI Application.
import React from 'react';
import ReactDOM from 'react-dom';
import Edit from './edit';

// Is our audience
const AudienceUI = document.getElementById( 'altis-analytics-audience-ui' );

if ( AudienceUI ) {
	// Mount audience react app.
	ReactDOM.render( <Edit />, AudienceUI );
}
