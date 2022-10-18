/// <reference path="../global.d.ts" />

import React from 'react';
import ReactDOM from 'react-dom';
import { SlotFillProvider } from '@wordpress/components';
import { register } from '@wordpress/data';

import AppComponent from './containers/App';
import { store } from '../data';

// Set up redux store.
register( store );

const root = document.getElementById( 'altis-analytics-root' );
const render = ( App: typeof AppComponent ) => ReactDOM.render(
	<SlotFillProvider>
		<App
			config={ window.AltisAccelerateDashboardData }
		/>
	</SlotFillProvider>,
	root
);

render( AppComponent );

// @ts-ignore
if ( module.hot ) {
	// @ts-ignore
	module.hot.accept( './containers/App', async () => {
		const App = await import( './containers/App' );
		render( App.default );
	} );
}
