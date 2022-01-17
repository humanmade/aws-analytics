/// <reference path="../global.d.ts" />

import React from 'react';
import ReactDOM from 'react-dom';
import { SlotFillProvider } from '@wordpress/components';
import { register } from '@wordpress/data';

import AppComponent from './components/App';
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
	module.hot.accept( './components/App', async () => {
		const App = await import( './components/App' );
		render( App.default );
	} );
}
