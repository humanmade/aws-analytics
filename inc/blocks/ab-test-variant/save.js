import React from 'react';

const { InnerBlocks } = wp.blockEditor;

/**
 * Block variant save mode component.
 *
 * @returns {React.ReactNode} Variant content component.
 */
const Save = () => {
	return (
		<InnerBlocks.Content />
	);
};

export default Save;
