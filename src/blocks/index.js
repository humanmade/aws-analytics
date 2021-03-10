// Blocks UI Application.
import React from 'react';
import ReactDOM from 'react-dom';

import Block from './ui/block';

// Get the block view placeholder.
const BlockView = document.getElementById( 'altis-analytics-xb-block' );

// Mount if our block UI placeholder is present.
if ( BlockView ) {
	ReactDOM.render(
		<Block clientId={ BlockView.dataset.clientId } />,
		BlockView
	);
}
