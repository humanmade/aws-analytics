import React from 'react';

import './Block.css';

interface Props {
	children: React.ReactNode,
	className?: string,
}

export default function Block( props: Props ) {
	const className = [ 'Block', props.className ].filter( Boolean ).join( ' ' );
	return (
		<div className={ className }>
			{ props.children }
		</div>
	);
}
