import React from 'react';

const { Button } = wp.components;
const { sprintf } = wp.i18n;

/**
 * Action Link Component.
 *
 * @param {object} props Component props.
 * @param {React.ReactChildren} props.children Component children.
 * @param {string} props.className HTML class name for the component.
 * @param {string} props.label Button label.
 * @param {object} props.post Post object.
 * @param {Function} props.onClick On click callback.
 * @returns {React.ReactNode} Action link component.
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
