import React from 'react';

const { Button } = wp.components;
const { sprintf } = wp.i18n;

/**
 * Action Link Component.
 *
 * @param {Object} props Component props.
 * @returns JSX
 */
const ActionLink = ( {
	children = null,
	className = '',
	label,
	post,
	onClick,
} ) => (
	<Button
		aria-label={ sprintf( label, post.title.rendered ) }
		className={ className }
		isLink
		onClick={ event => {
			event.preventDefault();
			onClick( post );
		} }
	>
		{ children || post.title.rendered }
	</Button>
);

export default ActionLink;
