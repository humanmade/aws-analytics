import { TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import BlockSelectorList from './BlockSelectorList';
import { Post } from '../../util';
import { useSelect } from '@wordpress/data';

type Props = {
	label: string,
	value: number[],
	onChange: ( blocks: number[] ) => void,
}

export default function BlockSelector( props: Props ) {
	const {
		value: blockIds,
		onChange,
	} = props;

	const [ search, setSearch ] = useState<string>( '' );

	const blocks = useSelect<Post[]>( select => {
		const args: {
			search?: string,
			include?: number[],
		} = {};

		if ( search.length > 0 ) {
			args.search = search;
		} else {
			args.include = blockIds;
		}

		return select( 'accelerate' ).getPosts( {
			type: 'wp_block,xb',
			...args,
		}, false );
	}, [ search, blockIds ] );

	return (
		<>
			<TextControl
				type="search"
				label={ __( 'Search blocks', 'altis' ) }
				placeholder={ __( 'Search blocks', 'altis' ) }
				value={ search }
				onChange={ setSearch }
			/>

			<BlockSelectorList
				blocks={ blocks }
				selected={ blockIds }
				onChange={ onChange }
			/>
		</>
	);
}