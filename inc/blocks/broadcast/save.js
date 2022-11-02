import React from 'react';

const { InnerBlocks } = wp.blockEditor;

/**
 * Broadcast block save component.
 *
 * @returns {React.ReactNode} The block contents.
 */
const Save = () => {
	return (
		<InnerBlocks.Content />
	);
};

export default Save;
