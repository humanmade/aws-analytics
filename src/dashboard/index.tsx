import React from 'react';
import ReactDOM from 'react-dom';
import { SlotFillProvider } from '@wordpress/components';
import { register } from '@wordpress/data';

import 'react-dates/initialize';
import 'react-dates/lib/css/_datepicker.css';

import AppComponent from './components/App';
import { store } from './data';

register( store );

const root = document.getElementById( 'altis-analytics-root' );
const render = ( App: typeof AppComponent ) => ReactDOM.render(
	<SlotFillProvider>
		<App />
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
