// Audience UI Application.
import React from 'react';
import ReactDOM from 'react-dom';

import { Manager, Select } from './ui';

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
