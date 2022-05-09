// Blocks UI Application.
import React from 'react';
import ReactDOM from 'react-dom';

import Insights from './ui/insights';

// Get the block view placeholder.
const BlockView = document.getElementById( 'altis-analytics-xb-block' );

// Mount if our block UI placeholder is present.
if ( BlockView ) {
	ReactDOM.render(
		<Insights clientId={ BlockView.dataset.clientId } />,
		BlockView
	);
}
