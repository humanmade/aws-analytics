import { useSelect } from '@wordpress/data';
import React, { useState } from 'react';
import { Post } from '../../util';
import Image from './Image';

type Props = {
	blocks: number[],
	className?: string,
	width?: number,
	height?: number,
};

const loaderProps = {
	speed: 2,
	foregroundColor: "#f5f6f8",
	backgroundColor: "#fff",
};

export default function ImageGroup ( props: Props ) {
	const {
		blocks: blockIds,
		className,
		width,
		height
	} = props;

	const blocks = useSelect<Post[]>( select => {
		return select( 'accelerate' ).getPosts( {
			type: 'wp_block,xb',
			include: blockIds,
		}, false );
	}, [ blockIds ] );

	return (
		<div className={ `record-thumbnail-group-wrap ${ blockIds.length > 1 ? "record-thumbnail-group-wrap--multiple" : "" }` }>
			{ blocks.slice( 0, 2 ).reverse().map( block => (
				<Image
					src={ block.thumbnail }
					alt={ block.title }
					className={ className }
					width={ width }
					height={ height }
				/>
			) ) }
		</div>
	);
};
